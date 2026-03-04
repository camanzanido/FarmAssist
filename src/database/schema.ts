import { column, Schema, Table } from '@powersync/react-native';

export const AppSchema = new Schema({
  users: new Table({
    name: column.text,
    username: column.text,
    password: column.text,
    status: column.text,
    created_at: column.text,
    user_type: column.text,
  }),

  locations: new Table({
    city: column.text,
    province: column.text,
    user_id: column.text,
  }),

  options: new Table({
    option_name: column.text,
    decision_type: column.text,
    price: column.real,
    cost: column.text,          // JSON "[w1,w2,w3,w4,w5,w6,w7]"
    add_cost: column.text,      // JSON
    yield: column.text,         // JSON
    location_id: column.text,
    user_id: column.text,
    created_at: column.text,
  }),

  decisions: new Table({
    decision_type: column.text,
    datetime: column.text,
    location_id: column.text,
    user_id: column.text,
    result: column.text,
    profit_increase: column.real,

    // Option 1
    first_option: column.text,
    first_price: column.real,
    first_cost: column.text,        // JSON "[w1,w2,w3,w4,w5,w6,w7]"
    first_add_cost: column.text,    // JSON
    first_yield: column.text,       // JSON

    // Option 2
    second_option: column.text,
    second_price: column.real,
    second_cost: column.text,       // JSON
    second_add_cost: column.text,   // JSON
    second_yield: column.text,      // JSON
  }),

  // Aggregation tables (read-only, populated by Supabase trigger)
  decision_stats_monthly: new Table({
    period: column.text,
    decision_type: column.text,
    total_decisions: column.integer,
    most_chosen_option: column.text,
    avg_profit_increase: column.real,
    updated_at: column.text,
  }),

  decision_stats_yearly: new Table({
    year: column.integer,
    decision_type: column.text,
    total_decisions: column.integer,
    most_chosen_option: column.text,
    avg_profit_increase: column.real,
    updated_at: column.text,
  }),

  user_activity_summary: new Table({
    user_id: column.text,
    period: column.text,
    total_decisions: column.integer,
    last_active: column.text,
  }),

  reports: new Table({
    title: column.text,
    period_start: column.text,
    period_end: column.text,
    generated_at: column.text,
    researcher_id: column.text,
  }),
});