/**
 * Shared types for the El Rio game.
 *
 * The model has three parts:
 *   1. A Scenario: the country, its targets, its resource limits and the
 *      options each ministry can choose from (see src/data/baseline.ts).
 *   2. A Plan: how many blocks of each option the player builds.
 *   3. An Outcome: what happens when the plan meets the shared river,
 *      aquifer, land and power grid (see src/model/simulate.ts).
 *
 * Units used everywhere in the model:
 *   - Water:        billion cubic metres per year (bcm/yr)
 *   - Electricity:  terawatt-hours per year (TWh/yr)
 *   - Food:         million tonnes of grain per year (Mt/yr)
 *   - Land:         million hectares (Mha)
 *   - CO2:          million tonnes of carbon dioxide per year (Mt CO2/yr)
 *   - Cost:         million US dollars per year (US$ M/yr), annualised
 */

/** The three ministries in the game. */
export type MinistryId = "agriculture" | "energy" | "water";

/**
 * What one block of an option does.
 * Every field is "per block". Fields that do not apply are left out
 * and treated as zero.
 */
export interface Effects {
  /** Annualised cost paid by the ministry that owns the option, US$ M/yr. */
  costMUSD: number;
  /** Grain produced, Mt/yr. */
  foodMt?: number;
  /** Water delivered to cities, bcm/yr. */
  cityWaterBcm?: number;
  /** Electricity generated, TWh/yr. For hydropower this is at natural river flow. */
  electricityTWh?: number;
  /** Water taken from the river upstream of the dams, bcm/yr. */
  riverBcm?: number;
  /** Groundwater pumped from the aquifer, bcm/yr. */
  aquiferBcm?: number;
  /** Electricity used for pumping, treatment or desalination, TWh/yr. */
  powerUseTWh?: number;
  /** Land occupied, Mha. */
  landMha?: number;
  /** CO2 emitted, Mt/yr. */
  co2Mt?: number;
}

/** One thing a ministry can build, in fixed-size blocks. */
export interface Option {
  id: string;
  ministry: MinistryId;
  /** Short name shown on the card, e.g. "Canal irrigation". */
  name: string;
  /** One sentence shown under the name. */
  summary: string;
  /** What one block is, e.g. "100,000 ha". */
  blockLabel: string;
  /** Largest number of blocks the player may build. */
  maxBlocks: number;
  /** Effects of one block. */
  perBlock: Effects;
  /**
   * True for hydropower only. Its output scales with the river flow
   * that is left at the dams after upstream users have taken their share.
   */
  dependsOnRiverFlow?: boolean;
  /**
   * True if this option needs grid electricity to work (pumps, treatment,
   * desalination). During a blackout it delivers only part of its output.
   */
  needsPower?: boolean;
  /**
   * Grain produced per block if the pumps get no power at all.
   * For irrigated farms this is the rain-fed yield of the same land.
   */
  fallbackFoodMt?: number;
  /** Hint text shown when the hint button adds blocks of this option. */
  hintMore?: string;
  /** Hint text shown when the hint button removes blocks of this option. */
  hintLess?: string;
}

/** Text and target shown to one ministry. */
export interface Ministry {
  id: MinistryId;
  name: string;
  /** The single target this ministry is judged on. */
  targetLabel: string;
  /** The brief the player reads before planning. */
  brief: string[];
  /** Colour token name used by the UI, e.g. "--agri". */
  colourVar: string;
}

/** A complete game setting: one fictional country and its choices. */
export interface Scenario {
  id: string;
  name: string;
  countryName: string;
  populationMillion: number;

  /** Targets that must be met. */
  targets: {
    foodMt: number;
    /** Electricity demand forecast by the Ministry of Energy. It excludes pumps and water treatment. */
    electricityTWh: number;
    cityWaterBcm: number;
  };

  /** Physical and policy limits shared by everyone. */
  limits: {
    /** Average natural river flow before anyone takes water, bcm/yr. */
    riverNaturalFlowBcm: number;
    /** Flow that must stay in the river for wetlands, fisheries and the delta, bcm/yr. */
    environmentalFlowBcm: number;
    /** Water that refills the aquifer each year, bcm/yr. Pumping more than this lowers the water table. */
    aquiferRechargeBcm: number;
    /** Land available for farms, solar farms and reservoirs, Mha. */
    landMha: number;
    /** National cap on power-sector CO2, Mt/yr. */
    co2CapMt: number;
  };

  /** Water lost by evaporation from reservoirs per TWh of hydropower, bcm/TWh. */
  hydroEvaporationBcmPerTWh: number;
  /** Volume of water stored per metre of aquifer depth, bcm/m. Used to turn overdraft into a water-table fall. */
  aquiferStorageBcmPerMetre: number;

  ministries: Ministry[];
  options: Option[];
}

/** Number of blocks of each option, keyed by option id. Missing ids count as zero. */
export type Plan = Record<string, number>;

/** One pass/fail test shown on the dashboard. */
export interface Check {
  id: "food" | "cityWater" | "electricity" | "river" | "aquifer" | "land" | "co2";
  label: string;
  /** True when the limit or target is respected. */
  ok: boolean;
  /** The value the plan produces. */
  value: number;
  /** The target (for "at least" checks) or the limit (for "at most" checks). */
  bound: number;
  /** "min" means value must be at least bound; "max" means at most bound. */
  kind: "min" | "max";
  unit: string;
}

/** Everything that happens when a plan meets the shared system. */
export interface Outcome {
  // Water
  riverUpstreamBcm: number;      // taken by farms and cities upstream of the dams
  riverTotalUseBcm: number;      // upstream use + power-station cooling + reservoir evaporation
  riverAllocatableBcm: number;   // natural flow minus environmental flow
  flowAtDamsBcm: number;
  riverRemainingBcm: number;     // what reaches the sea
  aquiferUseBcm: number;
  aquiferOverdraftBcm: number;
  waterTableFallMetresPerYear: number;

  // Electricity
  hydroFlowFactor: number;       // 1 = full natural flow at the dams
  generationBySource: Record<string, number>;
  generationTWh: number;
  demandBaseTWh: number;         // the Ministry of Energy forecast
  demandPumpsTWh: number;        // farm pumps (agriculture)
  demandWaterSupplyTWh: number;  // city water pumping, treatment, desalination
  demandTotalTWh: number;
  shortfallTWh: number;
  /** Share of demand that is actually served (1 = no blackouts). */
  serviceFactor: number;

  // Land, carbon, cost
  landUseMha: number;
  co2Mt: number;
  costByMinistry: Record<MinistryId, number>;
  costTotal: number;

  // Food and city water, before and after blackouts
  foodPlannedMt: number;
  foodDeliveredMt: number;
  cityWaterPlannedBcm: number;
  cityWaterDeliveredBcm: number;

  checks: Check[];
  /** True when every check passes. */
  feasible: boolean;
}
