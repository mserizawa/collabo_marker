defmodule CollaboMarker.EditorChannel do
  use Phoenix.Channel

  def join("editor:lobby", auth_msg, socket) do
    {:ok, socket}
  end
  def join("editor:" <> _private_room_id, _auth_msg, socket) do
    {:error, %{reason: "unauthorized"}}
  end

  def handle_in("edit", %{"event" => event, "user" => user}, socket) do
    broadcast! socket, "edit", %{event: event, user: user}
    {:noreply, socket}
  end

  def handle_in("move", %{"position" => position, "user" => user}, socket) do
    broadcast! socket, "move", %{position: position, user: user}
    {:noreply, socket}
  end
end
