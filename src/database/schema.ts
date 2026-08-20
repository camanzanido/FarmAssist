import { column, Schema, Table } from '@powersync/react-native';

export const AppSchema = new Schema({
  users: new Table({
    name: column.text,
    username: column.text,
    email: column.text,
    status: column.text,
    created_at: column.text,
    user_type: column.text,
  }),

  locations: new Table({
    city: column.text,
    province: column.text,
    user_id: column.text,
  }),

  // Reusable option profiles (user-configured templates)
  options: new Table({
    option_name: column.text,
    decision_type: column.text,
    price: column.real,
    location_id: column.text,
    user_id: column.text,
    created_at: column.text,

    cost_driest: column.real,
    cost_very_dry: column.real,
    cost_below_avg: column.real,
    cost_average: column.real,
    cost_above_avg: column.real,
    cost_very_good: column.real,
    cost_wettest: column.real,

    add_cost_driest: column.real,
    add_cost_very_dry: column.real,
    add_cost_below_avg: column.real,
    add_cost_average: column.real,
    add_cost_above_avg: column.real,
    add_cost_very_good: column.real,
    add_cost_wettest: column.real,

    yield_driest: column.real,
    yield_very_dry: column.real,
    yield_below_avg: column.real,
    yield_average: column.real,
    yield_above_avg: column.real,
    yield_very_good: column.real,
    yield_wettest: column.real,
  }),

  decisions: new Table({
    decision_type: column.text,   // 'crop_choice' | 'rainfall' | 'harvest'
    datetime: column.text,
    location_id: column.text,
    user_id: column.text,
    result: column.text,          // name of recommended option
    profit_increase: column.real, // score difference between the two options

    // Climate probabilities used at decision time
    climate_driest: column.real,
    climate_mid: column.real,
    climate_wettest: column.real,
  }),

  // Immutable snapshot of each option used in a decision
  decision_options: new Table({
    decision_id: column.text,     // FK to decisions
    option_slot: column.integer,  // 0 = first option, 1 = second option
    option_name: column.text,
    price: column.real,

    cost_driest: column.real,
    cost_very_dry: column.real,
    cost_below_avg: column.real,
    cost_average: column.real,
    cost_above_avg: column.real,
    cost_very_good: column.real,
    cost_wettest: column.real,

    add_cost_driest: column.real,
    add_cost_very_dry: column.real,
    add_cost_below_avg: column.real,
    add_cost_average: column.real,
    add_cost_above_avg: column.real,
    add_cost_very_good: column.real,
    add_cost_wettest: column.real,

    yield_driest: column.real,
    yield_very_dry: column.real,
    yield_below_avg: column.real,
    yield_average: column.real,
    yield_above_avg: column.real,
    yield_very_good: column.real,
    yield_wettest: column.real,
  }),

  // Aggregation tables (read-only, populated by Supabase triggers)
  decision_stats_monthly: new Table({
    period: column.text,          // format: 'YYYY-MM'
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
    period: column.text,          // format: 'YYYY-MM'
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