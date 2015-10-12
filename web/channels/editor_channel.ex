defmodule CollaboMarker.EditorChannel do
  use Phoenix.Channel

  def join("editor:lobby", auth_msg, socket) do
    socket = assign(socket, :user, auth_msg["user"]["name"])
    Process.flag(:trap_exit, true)
    :timer.send_interval(5000, :ping)

    users = ConCache.get_or_store(:cache, "users", fn() -> [] end)
    users = List.insert_at(users, -1, auth_msg["user"])
    ConCache.put(:cache, "users", users)

    send(self, :after_join)

    # TODO: send current contents
    {:ok, %{"users" => users}, socket}
  end
  def join("editor:" <> _private_room_id, _auth_msg, socket) do
    {:error, %{reason: "unauthorized"}}
  end

  def handle_info(:after_join, socket) do
    broadcast! socket, "update_user", %{"users": ConCache.get(:cache, "users")}

    {:noreply, socket}
  end

  def handle_in("edit", %{"event" => event, "user" => user}, socket) do
    broadcast! socket, "edit", %{event: event, user: user}
    {:noreply, socket}
  end

  def handle_in("move", %{"position" => position, "user" => user}, socket) do
    broadcast! socket, "move", %{position: position, user: user}
    {:noreply, socket}
  end

  def handle_info(:ping, socket) do
    push socket, "ping", %{body: "ping", user: "SYSTEM"}
    {:noreply, socket}
  end

  def terminate(reason, socket) do
    user_name = socket.assigns.user
    users = ConCache.get(:cache, "users")
      |> Enum.filter(fn(user) -> user["name"] != user_name end)
    ConCache.put(:cache, "users", users)

    broadcast! socket, "update_user", %{"users": users}

    :ok
  end
end
