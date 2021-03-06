defmodule CollaboMarker.Router do
  use CollaboMarker.Web, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", CollaboMarker do
    pipe_through :browser # Use the default browser stack

    get "/", PageController, :index
  end

  scope "/save", CollaboMarker do
    pipe_through :api

    post "/", PageController, :save
  end

  # Other scopes may use custom stacks.
  # scope "/api", CollaboMarker do
  #   pipe_through :api
  # end
end
