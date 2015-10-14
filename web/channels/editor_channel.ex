defmodule CollaboMarker.EditorChannel do
  use Phoenix.Channel

  def join("editor:lobby", _auth_msg, socket) do
    users = ConCache.get_or_store(:cache, "users", fn() -> [] end)
    contents = ConCache.get_or_store(:cache, "contents", fn() -> "" end)

    {:ok, %{"users" => users, "contents" => contents}, socket}
  end
  def join("editor:" <> _private_room_id, _auth_msg, socket) do
    {:error, %{reason: "unauthorized"}}
  end

  def handle_in("join", %{"user" => user}, socket) do
    users = ConCache.get(:cache, "users")
    user_names = users |> Enum.map(fn(e) -> e["name"] end)

    case !Enum.member?(user_names, user["name"]) do
      true -> (
        socket = assign(socket, :user, user["name"])
        Process.flag(:trap_exit, true)
        :timer.send_interval(5000, :ping)

        users = List.insert_at(users, -1, user)
        ConCache.put(:cache, "users", users)

        broadcast! socket, "update_user", %{"users": ConCache.get(:cache, "users")}
        {:reply, {:ok, %{}}, socket}
      )
      false -> (
        {:reply, {:error, %{}}, socket}
      )
    end

  end

  def handle_in("edit", %{"event" => event, "user" => user}, socket) do
    broadcast! socket, "edit", %{event: event, user: user}
    {:noreply, socket}
  end

  def handle_in("move", %{"position" => position, "user" => user}, socket) do
    broadcast! socket, "move", %{position: position, user: user}
    {:noreply, socket}
  end

  def handle_in("message", %{"message" => message, "user" => user}, socket) do
    broadcast! socket, "message", %{message: message, user: user}
    {:noreply, socket}
  end

  def handle_info(:ping, socket) do
    push socket, "ping", %{body: "ping", user: "SYSTEM"}
    {:noreply, socket}
  end

  def terminate(reason, socket) do
    case Map.get(socket.assigns, :user) do
      nil -> :ok
      _ -> (
        user_name = socket.assigns.user
        users = ConCache.get(:cache, "users")
          |> Enum.filter(fn(user) -> user["name"] != user_name end)
        ConCache.put(:cache, "users", users)

        broadcast! socket, "update_user", %{"users": users}

        :ok
      )
    end
  end
end
