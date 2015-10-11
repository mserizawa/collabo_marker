defmodule CollaboMarker.PageController do
  use CollaboMarker.Web, :controller

  def index(conn, _params) do
    render conn, "index.html"
  end
end
