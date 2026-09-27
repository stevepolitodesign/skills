# Recording what happened

The goal is one ordered log of everything the scenario did, captured while it
ran. Not the full SQL log: reads drown the writes. Keep writes, jobs, mail,
renders, redirects, broadcasts, and outside calls. Keep reads only when there are
a suspicious number of them (the same `SELECT` twenty times is a finding).

## Rails

Rails already announces nearly everything worth recording through
`ActiveSupport::Notifications`. Subscribe for the length of the scenario and
collect events in order. Drop this into the throwaway spec, or wrap an existing
example with it:

```ruby
events = []
record = ->(name, _start, _finish, _id, payload) { events << [name, payload] }

subscriptions = %w[
  sql.active_record
  enqueue.active_job enqueue_at.active_job perform.active_job
  deliver.action_mailer
  process_action.action_controller redirect_to.action_controller
  render_template.action_view
].map { |name| ActiveSupport::Notifications.subscribe(name, record) }

begin
  # run the scenario here: post "/users", params: {...}
  # then perform_enqueued_jobs to follow the chain
ensure
  subscriptions.each { |s| ActiveSupport::Notifications.unsubscribe(s) }
end

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
    end
  puts "TRACE #{line}"
end
```

Adjust the event list to the scenario rather than dumping everything. Useful extras:

- **Turbo broadcasts:** `Turbo::StreamsChannel` goes through ActionCable, so
  subscribe to `broadcast.action_cable` (payload has `broadcasting` and `message`).
- **Outside HTTP:** with WebMock loaded, `WebMock.after_request { |req, _| ... }`
  records every attempted call, stubbed or not. Pair it with `stub_request` so
  nothing leaves the machine.
- **Callbacks:** there's no event for them. Find them by reading the model, then
  confirm each one ran by the SQL or job it produced. If a callback produces
  nothing observable, it's `read`, not `ran`.
- **Where a write came from:** set `ActiveRecord.verbose_query_logs = true` (or
  `ActiveRecord::Base.verbose_query_logs` on older Rails) and the log line gets a
  `↳ app/models/user.rb:42` source location. That's the `file:line` for the ledger,
  observed rather than guessed.

Run a single example so the output is only this scenario:
`bin/rspec spec/requests/users_spec.rb:12` or `bin/rails test test/...:12`.

If the jobs adapter is `:test`, enqueued jobs don't run on their own —
`perform_enqueued_jobs` inside the block does. If it's `:inline`, they already ran
and their events are in the log.

## Anywhere else

Same idea, different tap. Look for what the stack already emits before writing
your own:

- **Log level.** Most frameworks log queries and requests at debug. Turn it up for
  one run, capture stdout, filter.
- **The ORM's query hook.** Nearly every ORM has an event or logger for executed
  statements. Use that over reading the model.
- **An HTTP stub library** in the test suite usually records attempted requests.
- **Print statements** at the entry and exit of each step, as a last resort, in a
  copy you delete after.

Whatever the tap, tag each line (`TRACE ...`) so you can filter it out of the
test runner's own noise.
