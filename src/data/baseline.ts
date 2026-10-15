/**
 * Baseline scenario: the fictional Republic of Utopia.
 *
 * Every number in the game lives in this file. Change a number here and
 * the whole game follows. Run `npm test` afterwards: the calibration test
 * checks that the silo trap still works (see tests/calibration.test.ts).
 *
 * Each coefficient is either taken from the literature (source named in
 * the comment) or marked ASSUMPTION. Assumptions are rounded, plausible
 * values chosen for teaching. They are not data for any real country.
 * The same list is shown to players on the "Data and assumptions" screen
 * (src/data/assumptions.ts).
 *
 * Block sizes:
 *   Agriculture: 1 block = 100,000 hectares (0.1 Mha) of farmland
 *   Water:       1 block = 0.25 billion m3 per year delivered to cities
 *   Energy:      1 block = one power project (size given per option)
 */
import type { Scenario } from "../model/types.ts";

// ---------------------------------------------------------------------------
// Physical coefficients (shared by several options and by the assumptions table)
// ---------------------------------------------------------------------------
export const COEFFICIENTS = {
  /** Irrigation water need, m3 per hectare per year. Slide 12 gives 5,000 to 10,000. */
  irrigationM3PerHa: 8_000,
  /** Drip irrigation water need, m3 per hectare per year. ASSUMPTION: about 40% less than canals. */
  dripM3PerHa: 5_000,
  /**
   * Energy to lift groundwater, kWh per m3.
   * Physics: rho * g * head / efficiency = 1000 * 9.81 * 70 m / 0.65 = 0.29 kWh/m3.
   * ASSUMPTION: 70 m total head and 65% pump efficiency.
   * Slide 12 gives 140 kWh per million litres (0.14 kWh/m3) at 35 m, which is consistent.
   */
  pumpingKWhPerM3: 0.3,
  /** Energy to pressurise drip lines, kWh per m3. ASSUMPTION. */
  dripKWhPerM3: 0.15,
  /** Energy to treat and distribute river water for cities, kWh per m3. ASSUMPTION. */
  cityTreatmentKWhPerM3: 0.3,
  /** Extra energy to treat well water for cities, kWh per m3, on top of pumping. ASSUMPTION. */
  wellTreatmentKWhPerM3: 0.05,
  /** Seawater reverse osmosis, kWh per m3. Elimelech and Phillip (2011), Science 333, 712-717: 3 to 4 kWh/m3. */
  desalinationKWhPerM3: 3.5,
  /** Grain yields, tonnes per hectare. ASSUMPTION: irrigation lifts yield from 2.0 to 5.0 t/ha. */
  rainfedYieldTPerHa: 2.0,
  irrigatedYieldTPerHa: 5.0,
};
const C = COEFFICIENTS;

// Small helpers that turn per-hectare or per-m3 figures into per-block figures.
const HA_PER_FARM_BLOCK = 100_000;
const M3_PER_WATER_BLOCK = 0.25e9;
/** m3 per hectare -> bcm per farm block */
const farmWater = (m3PerHa: number) => (m3PerHa * HA_PER_FARM_BLOCK) / 1e9;
/** t per hectare -> Mt per farm block */
const farmFood = (tPerHa: number) => (tPerHa * HA_PER_FARM_BLOCK) / 1e6;
/** kWh per m3 times bcm -> TWh (1 bcm * 1 kWh/m3 = 1 TWh) */
const pumpEnergy = (bcm: number, kWhPerM3: number) => bcm * kWhPerM3;

export const BASELINE: Scenario = {
  id: "baseline",
  name: "Baseline",
  countryName: "Utopia",
  populationMillion: 20,

  targets: {
    // ASSUMPTION: 400 kg of grain per person per year for 20 million people.
    foodMt: 8,
    // ASSUMPTION: 1,500 kWh per person per year for 20 million people.
    electricityTWh: 30,
    // ASSUMPTION: 100 m3 per person per year (about 270 litres a day, homes and industry).
    cityWaterBcm: 2.0,
  },

  limits: {
    riverNaturalFlowBcm: 14, // ASSUMPTION
    environmentalFlowBcm: 4, // ASSUMPTION: about 30% of natural flow kept in the river
    aquiferRechargeBcm: 3, // ASSUMPTION
    landMha: 4.0, // ASSUMPTION: 0.2 ha per person
    co2CapMt: 10, // ASSUMPTION: national power-sector cap
  },

  /**
   * Reservoir evaporation, bcm per TWh of hydropower.
   * Macknick et al. (2012), Environ. Res. Lett. 7, 045802: median 4,491 gallons/MWh = 17 m3/MWh.
   */
  hydroEvaporationBcmPerTWh: 0.017,

  /** ASSUMPTION: aquifer area 25,000 km2 with specific yield 0.10, so 2.5 bcm per metre of depth. */
  aquiferStorageBcmPerMetre: 2.5,

  ministries: [
    {
      id: "agriculture",
      name: "Ministry of Agriculture",
      targetLabel: "Grow 8 million tonnes of grain a year",
      colourVar: "--agri",
      brief: [
        "Utopia must feed 20 million people. Your target is 8 million tonnes of grain a year.",
        "Irrigated land yields 2.5 times more grain than rain-fed land.",
        "Farm electricity is free under the national pump subsidy. Your budget does not pay for it.",
        "You are judged on one thing: meeting the target at the lowest cost to your ministry.",
      ],
    },
    {
      id: "energy",
      name: "Ministry of Energy",
      targetLabel: "Generate 30 TWh of electricity a year",
      colourVar: "--energy",
      brief: [
        "Your forecast says Utopia needs 30 TWh of electricity a year for homes, offices and industry.",
        "Power-sector emissions must stay under 10 Mt CO2 a year.",
        "The three dam sites in the River gorge are rated at the river's natural flow.",
        "You are judged on one thing: meeting the forecast at the lowest cost to your ministry.",
      ],
    },
    {
      id: "water",
      name: "Ministry of Water Supply",
      targetLabel: "Supply 2.0 billion m³ of water to cities a year",
      colourVar: "--water",
      brief: [
        "Utopia's cities need 2.0 billion m³ of clean water a year.",
        "Electricity for pumps and treatment plants comes from the grid. The Ministry of Energy pays for it.",
        "You are judged on one thing: meeting the target at the lowest cost to your ministry.",
      ],
    },
  ],

  options: [
    // ------------------------------------------------------------------ Agriculture
    {
      id: "rainfed",
      hintMore: "Rain-fed farms grow food with no river water and no pumps. They need more land.",
      hintLess: "Rain-fed farms take the most land per tonne. Fewer of them frees land for other uses.",
      ministry: "agriculture",
      name: "Rain-fed farms",
      summary: "No irrigation. Low cost, low yield, lots of land.",
      blockLabel: "100,000 ha",
      maxBlocks: 35,
      perBlock: {
        costMUSD: 30, // ASSUMPTION: US$300 per ha per year
        foodMt: farmFood(C.rainfedYieldTPerHa),
        landMha: 0.1,
      },
    },
    {
      id: "canal",
      hintMore: "A few canals grow food on little land and need no power.",
      hintLess: "Canals take river water before it reaches the dams. Fewer canals leave more water for hydropower.",
      ministry: "agriculture",
      name: "Canal irrigation",
      summary: "Gravity canals from the river. High yield. Uses river water.",
      blockLabel: "100,000 ha",
      maxBlocks: 15,
      perBlock: {
        costMUSD: 50, // ASSUMPTION: US$500 per ha per year
        foodMt: farmFood(C.irrigatedYieldTPerHa),
        riverBcm: farmWater(C.irrigationM3PerHa),
        landMha: 0.1,
      },
    },
    {
      id: "tubewell",
      hintMore: "Tube wells grow food on little land, if the aquifer still has room.",
      hintLess: "Tube wells pump the same aquifer as the city wells, and they need power. Fewer tube wells protect both.",
      ministry: "agriculture",
      name: "Tube-well irrigation",
      summary: "Electric pumps lift groundwater. High yield. Power is free to farmers.",
      blockLabel: "100,000 ha",
      maxBlocks: 10,
      needsPower: true,
      fallbackFoodMt: farmFood(C.rainfedYieldTPerHa),
      perBlock: {
        costMUSD: 40, // ASSUMPTION: US$400 per ha per year, excluding subsidised electricity
        foodMt: farmFood(C.irrigatedYieldTPerHa),
        aquiferBcm: farmWater(C.irrigationM3PerHa),
        powerUseTWh: pumpEnergy(farmWater(C.irrigationM3PerHa), C.pumpingKWhPerM3),
        landMha: 0.1,
      },
    },
    {
      id: "drip",
      hintMore: "Drip irrigation grows the same food as canals with less river water.",
      hintLess: "Drip irrigation is the most expensive way to grow grain.",
      ministry: "agriculture",
      name: "Drip irrigation",
      summary: "Pressurised pipes from the river. High yield with less water. Costly.",
      blockLabel: "100,000 ha",
      maxBlocks: 10,
      needsPower: true,
      fallbackFoodMt: farmFood(C.rainfedYieldTPerHa),
      perBlock: {
        costMUSD: 75, // ASSUMPTION: US$750 per ha per year
        foodMt: farmFood(C.irrigatedYieldTPerHa),
        riverBcm: farmWater(C.dripM3PerHa),
        powerUseTWh: pumpEnergy(farmWater(C.dripM3PerHa), C.dripKWhPerM3),
        landMha: 0.1,
      },
    },

    // ------------------------------------------------------------------ Water supply
    {
      id: "riverIntake",
      hintMore: "A river intake supplies cities without touching the aquifer.",
      hintLess: "River intakes take water above the dams. Less intake leaves more water for hydropower.",
      ministry: "water",
      name: "River intake",
      summary: "Take water from the River above the gorge and treat it.",
      blockLabel: "0.25 bcm/yr",
      maxBlocks: 8,
      needsPower: true,
      perBlock: {
        costMUSD: 0.15 * M3_PER_WATER_BLOCK / 1e6, // ASSUMPTION: US$0.15 per m3, excluding electricity
        cityWaterBcm: 0.25,
        riverBcm: 0.25,
        powerUseTWh: pumpEnergy(0.25, C.cityTreatmentKWhPerM3),
      },
    },
    {
      id: "wells",
      hintMore: "City wells are the cheapest water supply while the aquifer has room.",
      hintLess: "City wells pump the same aquifer as the tube wells. Fewer wells stop the water table falling.",
      ministry: "water",
      name: "City wells",
      summary: "Pump groundwater from the aquifer under the plain.",
      blockLabel: "0.25 bcm/yr",
      maxBlocks: 8,
      needsPower: true,
      perBlock: {
        costMUSD: 0.1 * M3_PER_WATER_BLOCK / 1e6, // ASSUMPTION: US$0.10 per m3, excluding electricity
        cityWaterBcm: 0.25,
        aquiferBcm: 0.25,
        powerUseTWh: pumpEnergy(0.25, C.pumpingKWhPerM3 + C.wellTreatmentKWhPerM3), // pumping plus light treatment
      },
    },
    {
      id: "desal",
      hintMore: "Desalination supplies cities without river or aquifer water.",
      hintLess: "Desalination needs a lot of power. Less of it closes the power gap.",
      ministry: "water",
      name: "Desalination",
      summary: "Turn seawater into drinking water. No river or aquifer water. Power-hungry.",
      blockLabel: "0.25 bcm/yr",
      maxBlocks: 8,
      needsPower: true,
      perBlock: {
        costMUSD: 0.6 * M3_PER_WATER_BLOCK / 1e6, // ASSUMPTION: US$0.60 per m3, excluding electricity
        cityWaterBcm: 0.25,
        powerUseTWh: pumpEnergy(0.25, C.desalinationKWhPerM3),
      },
    },

    // ------------------------------------------------------------------ Energy
    {
      id: "solar",
      hintMore: "Solar is the cheapest clean power, up to the grid limit.",
      hintLess: "Solar is not the problem here.",
      ministry: "energy",
      name: "Solar farm",
      summary: "Cheap, clean power. Needs land. The grid can take at most 10 TWh without storage.",
      blockLabel: "1 TWh/yr (about 570 MW)",
      maxBlocks: 10, // ASSUMPTION: grid limit for solar without storage
      perBlock: {
        costMUSD: 44, // IRENA (2024), Renewable Power Generation Costs in 2023: US$0.044/kWh
        electricityTWh: 1,
        // Ong et al. (2013), NREL/TP-6A20-56290: about 3.2 ha per MW.
        // At a 20% capacity factor that is about 1.8 ha per GWh/yr. Rounded to 2.
        landMha: 0.002,
        co2Mt: 0.048, // IPCC AR5 WGIII Annex III (2014): life-cycle median 48 g CO2-eq/kWh
      },
    },
    {
      id: "hydro",
      hintMore: "Dams are cheap clean power when the river reaches them.",
      hintLess: "Dams starved of water cost money and deliver little.",
      ministry: "energy",
      name: "Hydropower dam",
      summary: "Cheap, clean, reliable. Output depends on how much river water reaches the gorge.",
      blockLabel: "4 TWh/yr at natural flow",
      maxBlocks: 3,
      dependsOnRiverFlow: true,
      perBlock: {
        costMUSD: 4 * 57, // IRENA (2024): US$0.057/kWh
        electricityTWh: 4,
        landMha: 0.03, // ASSUMPTION: reservoir of 30,000 ha per dam
        co2Mt: 4 * 0.024, // IPCC AR5 WGIII Annex III (2014): 24 g CO2-eq/kWh
      },
    },
    {
      id: "coal",
      hintMore: "Coal is cheap, reliable power while emissions stay under the cap.",
      hintLess: "Coal pushes emissions over the cap. Replace it with gas or solar.",
      ministry: "energy",
      name: "Coal power plant",
      summary: "Cheap, reliable, high emissions.",
      blockLabel: "2 TWh/yr (about 300 MW)",
      maxBlocks: 8,
      perBlock: {
        costMUSD: 2 * 70, // ASSUMPTION: US$0.070/kWh
        electricityTWh: 2,
        // Macknick et al. (2012): cooling tower, median 687 gallons/MWh = 2.6 m3/MWh
        riverBcm: 2 * 0.0026,
        landMha: 0.001,
        co2Mt: 2 * 0.82, // IPCC AR5 WGIII Annex III (2014): 820 g CO2-eq/kWh
      },
    },
    {
      id: "gas",
      hintMore: "Gas fills the power gap with half the emissions of coal.",
      hintLess: "Gas is the most expensive power. Less of it cuts cost.",
      ministry: "energy",
      name: "Gas power plant",
      summary: "Reliable. Half the emissions of coal. More expensive.",
      blockLabel: "2 TWh/yr (about 300 MW)",
      maxBlocks: 8,
      perBlock: {
        costMUSD: 2 * 80, // ASSUMPTION: US$0.080/kWh
        electricityTWh: 2,
        // Macknick et al. (2012): combined cycle with cooling tower, about 200 gallons/MWh = 0.75 m3/MWh
        riverBcm: 2 * 0.00075,
        landMha: 0.001,
        co2Mt: 2 * 0.49, // IPCC AR5 WGIII Annex III (2014): 490 g CO2-eq/kWh
      },
    },
  ],
};
