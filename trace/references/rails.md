# Tracing a Rails app

## Copy the development databases

`config/database.yml` under `development:` lists every database. Apps on Solid
Queue, Solid Cable, or Solid Cache often have three or four (`primary`, `queue`,
`cable`, `cache`). Copy each one the scenario could touch.

- **Postgres:** `createdb -T app_development app_development_trace_signup`. It
  fails if anything is connected to the source (a running dev server). Then
  `createdb app_development_trace_signup` and
  `pg_dump -Fc app_development | pg_restore -d app_development_trace_signup`.
- **SQLite:** copy the file (`storage/development.sqlite3`).
- **MySQL:** `mysqldump app_development | mysql app_development_trace_signup`
  into a database you created.

Point the run at the copies with environment variables. Rails merges
`DATABASE_URL` into `primary` and `<NAME>_DATABASE_URL` into each other entry,
so `database.yml` stays untouched:

```
DATABASE_URL=postgres:///app_development_trace_signup \
QUEUE_DATABASE_URL=postgres:///app_development_queue_trace_signup \
CABLE_DATABASE_URL=postgres:///app_development_cable_trace_signup \
bin/rails runner tmp/trace_signup.rb
```

Check it took: print `ActiveRecord::Base.connection_db_config.database` (and
`SolidQueue::Record`, `SolidCable::Record` if present) at the top of the script,
and abort if any of them is the original name.

## Drive the request in-process

A runner script in `tmp/` (gitignored) loads the app in development. An
integration session sends a real request through the whole stack — routes,
middleware, controller, views — without a server:

```ruby
session = ActionDispatch::Integration::Session.new(Rails.application)
session.host! "localhost"
session.post "/session", params: { email: "sam@example.com", password: "trace-pass-1" }
session.post "/projects/17/messages", params: { message: { content: "Hi" } }
puts "TRACE response #{session.response.status} #{session.response.location}"
```

Queries the script runs after a request, including the jobs you perform, can
crash inside query logging (`NoMethodError` from `ActiveRecord::QueryLogs` or
the error reporter). Call `ActiveSupport::ExecutionContext.clear` after each
`session.post`/`get`.

Things development does that get in the way, and what to change for the script
only (list each in the trace's Holes):

- **Host check.** The default host `www.example.com` is blocked in development;
  `host! "localhost"` is allowed.
- **CSRF.** Development checks the token, so a bare POST fails. Set
  `ActionController::Base.allow_forgery_protection = false`.
- **Sign-in.** Create the user with a password you pick and post to the app's
  real sign-in route. Test-only sign-in shortcuts aren't loaded in development.
- **Mail.** `letter_opener` opens a browser tab. Set
  `ActionMailer::Base.delivery_method = :test`; sent mail lands in
  `ActionMailer::Base.deliveries`.

## Intercept outside calls

WebMock is usually only in the `:test` group, but Bundler still puts it on the
load path in development. Require it at the top of the script:

```ruby
require "webmock"
include WebMock::API
WebMock.enable!
WebMock.disable_net_connect!(allow_localhost: true)

stub_request(:post, "https://api.anthropic.com/v1/messages")
  .to_return(status: 200, body: canned_body, headers: { "Content-Type" => "application/json" })
WebMock.after_request { |req, _| puts "TRACE http #{req.method} #{req.uri} #{req.body}" }
```

With `disable_net_connect!`, any call you didn't stub raises instead of going
out, which tells you about a call you missed. The test suite often has helpers
that build realistic canned bodies (`spec/support`, `test/support`); load them
with `require Rails.root.join("spec/support/...")` rather than writing your own.

Process kills, shell-outs, and file moves have no single hook. Stub the method
the app calls (`Process.kill`, the class wrapping the shell) with
`define_singleton_method` in the script, or point the app's configured directory
at `Dir.mktmpdir`.

## Follow the job chain

Swap the adapter for the script, so jobs queue during the request instead of
going to Solid Queue, Sidekiq, or running inline:

```ruby
ActiveJob::Base.queue_adapter = :test
adapter = ActiveJob::Base.queue_adapter

# ... send the request ...

level = 0
until adapter.enqueued_jobs.empty?
  level += 1
  batch = adapter.enqueued_jobs.shift(adapter.enqueued_jobs.size)
  batch.each do |job|
    puts "TRACE level #{level} perform #{job["job_class"]} #{job["arguments"].inspect}"
    ActiveJob::Base.execute(job)
  end
end
```

A job class that sets its own `queue_adapter` ignores this; check for that.

## Record what happened

Rails announces nearly everything worth recording through
`ActiveSupport::Notifications`. Subscribe before the request, collect in order,
print after. Not the full SQL log: reads drown the writes. Keep writes, jobs,
mail, renders, redirects, broadcasts. Keep reads only when there are a
suspicious number of them (the same `SELECT` twenty times is a finding).

```ruby
events = []
record = ->(name, _start, _finish, _id, payload) { events << [name, payload] }

%w[
  sql.active_record
  enqueue.active_job enqueue_at.active_job perform.active_job
  deliver.action_mailer
  process_action.action_controller redirect_to.action_controller
  render_template.action_view
  broadcast.action_cable
].each { |name| ActiveSupport::Notifications.subscribe(name, record) }

# ... request, then the job loop ...

events.each do |name, p|
  line =
    case name
    when "sql.active_record"
      next if p[:name] == "SCHEMA" || p[:sql] !~ /\A\s*(INSERT|UPDATE|DELETE)/i
      "#{p[:sql]} #{p[:binds]&.map { |b| b.respond_to?(:value) ? b.value : b }.inspect}"
    when /active_job/ then "#{name} #{p[:job].class.name} #{p[:job].arguments.inspect}"
    when "deliver.action_mailer" then "mail #{p[:mailer]} to=#{p[:to].inspect} subject=#{p[:subject].inspect}"
    when "process_action.action_controller" then "#{p[:controller]}##{p[:action]} -> #{p[:status]}"
    when "redirect_to.action_controller" then "redirect #{p[:location]}"
    when "render_template.action_view" then "render #{p[:identifier].to_s.sub(Rails.root.to_s + '/', '')}"
    when "broadcast.action_cable" then "broadcast #{p[:broadcasting]} #{p[:message].to_s[0, 120]}"
    end
  puts "TRACE #{line}"
end
```

- **Callbacks** have no event. Find them by reading the model, then confirm each
  ran by the SQL or job it produced. One that produces nothing observable is
  `read`, not `ran`.
- **Where a write came from:** development usually has
  `config.active_record.verbose_query_logs = true`, which adds a
  `↳ app/models/user.rb:42` line to `log/development.log` under each query.
  That's the `file:line` for the ledger, observed rather than guessed. The log
  file is gitignored, but note its size before and read only what this run
  appended.

Filter the output with `grep '^TRACE'`.
