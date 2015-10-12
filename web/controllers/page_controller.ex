defmodule CollaboMarker.PageController do
  use CollaboMarker.Web, :controller

  def index(conn, _params) do
    render conn, "index.html"
  end

  def save(conn, params) do
    ConCache.put(:cache, "contents", params["contents"])

    json conn, "ok"
  end

end
