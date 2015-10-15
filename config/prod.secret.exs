use Mix.Config

# In this file, we keep production configuration that
# you likely want to automate and keep it away from
# your version control system.
config :collabo_marker, CollaboMarker.Endpoint,
  secret_key_base: "RawvHMJQ8AW4VY1eMJStuSSg/cS6+JtLU6shqF/I2xu43rso3C71xy7jmZSDeDw/"

# Configure your database
config :collabo_marker, CollaboMarker.Repo,
  adapter: Ecto.Adapters.Postgres,
  username: "postgres",
  password: "postgres",
  database: "collabo_marker_prod",
  pool_size: 20
