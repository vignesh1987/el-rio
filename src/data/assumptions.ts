/**
 * The "Data and assumptions" table shown to players.
 *
 * Values are read from src/data/baseline.ts so the table can never
 * disagree with the model. Each row says whether the number comes from
 * the literature or is a teaching assumption.
 */
import { BASELINE, COEFFICIENTS as C } from "./baseline.ts";

export type Basis = "Literature" | "Assumption" | "Physics";

export interface AssumptionRow {
  group: "Country" | "Water" | "Food" | "Energy";
  item: string;
  value: string;
  basis: Basis;
  source: string;
}

const option = (id: string) => {
  const found = BASELINE.options.find((o) => o.id === id);
  if (!found) throw new Error(`Unknown option ${id}`);
  return found;
};
const per = (id: string) => option(id).perBlock;
/** Round to one decimal place to hide floating-point noise. */
const round1 = (x: number) => Math.round(x * 10) / 10;

export const ASSUMPTIONS: AssumptionRow[] = [
  // Country
  { group: "Country", item: "Population", value: `${BASELINE.populationMillion} million`, basis: "Assumption", source: "Fictional country" },
  { group: "Country", item: "Food target", value: `${BASELINE.targets.foodMt} Mt grain/yr (400 kg per person)`, basis: "Assumption", source: "Teaching value" },
  { group: "Country", item: "Electricity forecast", value: `${BASELINE.targets.electricityTWh} TWh/yr (1,500 kWh per person)`, basis: "Assumption", source: "Teaching value" },
  { group: "Country", item: "City water target", value: `${BASELINE.targets.cityWaterBcm} bcm/yr (100 m³ per person)`, basis: "Assumption", source: "Teaching value" },
  { group: "Country", item: "Land for farms, solar and reservoirs", value: `${BASELINE.limits.landMha} Mha`, basis: "Assumption", source: "Teaching value" },
  { group: "Country", item: "Power-sector CO₂ cap", value: `${BASELINE.limits.co2CapMt} Mt/yr`, basis: "Assumption", source: "Teaching value" },

  // Water
  { group: "Water", item: "Natural river flow", value: `${BASELINE.limits.riverNaturalFlowBcm} bcm/yr`, basis: "Assumption", source: "Teaching value" },
  { group: "Water", item: "Environmental flow kept in the river", value: `${BASELINE.limits.environmentalFlowBcm} bcm/yr`, basis: "Assumption", source: "About 30% of natural flow" },
  { group: "Water", item: "Aquifer recharge", value: `${BASELINE.limits.aquiferRechargeBcm} bcm/yr`, basis: "Assumption", source: "Teaching value" },
  { group: "Water", item: "Aquifer storage", value: `${BASELINE.aquiferStorageBcmPerMetre} bcm per metre of water table`, basis: "Assumption", source: "25,000 km² area, specific yield 0.10" },
  { group: "Water", item: "Irrigation water (canal, tube well)", value: `${C.irrigationM3PerHa.toLocaleString("en-GB")} m³/ha/yr`, basis: "Literature", source: "Lecture slide 12: 5,000 to 10,000 m³/ha/yr" },
  { group: "Water", item: "Drip irrigation water", value: `${C.dripM3PerHa.toLocaleString("en-GB")} m³/ha/yr`, basis: "Assumption", source: "About 40% less than canals" },
  { group: "Water", item: "Pumping groundwater", value: `${C.pumpingKWhPerM3} kWh/m³`, basis: "Physics", source: "ρgh/η with 70 m head and 65% efficiency; slide 12 gives 0.14 kWh/m³ at 35 m" },
  { group: "Water", item: "Treating river water for cities", value: `${C.cityTreatmentKWhPerM3} kWh/m³`, basis: "Assumption", source: "Teaching value" },
  { group: "Water", item: "Seawater desalination", value: `${C.desalinationKWhPerM3} kWh/m³`, basis: "Literature", source: "Elimelech and Phillip (2011), Science 333: 712–717" },
  { group: "Water", item: "Reservoir evaporation", value: `${round1(BASELINE.hydroEvaporationBcmPerTWh * 1000)} m³/MWh`, basis: "Literature", source: "Macknick et al. (2012), Environ. Res. Lett. 7: 045802" },
  { group: "Water", item: "Coal plant cooling (tower)", value: `${round1((per("coal").riverBcm! / per("coal").electricityTWh!) * 1000)} m³/MWh`, basis: "Literature", source: "Macknick et al. (2012)" },

  // Food
  { group: "Food", item: "Rain-fed grain yield", value: `${C.rainfedYieldTPerHa} t/ha`, basis: "Assumption", source: "Teaching value" },
  { group: "Food", item: "Irrigated grain yield", value: `${C.irrigatedYieldTPerHa} t/ha`, basis: "Assumption", source: "Teaching value" },
  { group: "Food", item: "Farm costs (rain-fed, canal, tube well, drip)", value: "US$300, 500, 400, 750 per ha/yr", basis: "Assumption", source: "Tube-well cost excludes subsidised power" },

  // Energy
  { group: "Energy", item: "Solar cost", value: `US$${per("solar").costMUSD} per MWh`, basis: "Literature", source: "IRENA (2024), Renewable Power Generation Costs in 2023" },
  { group: "Energy", item: "Hydropower cost", value: `US$${per("hydro").costMUSD / per("hydro").electricityTWh!} per MWh`, basis: "Literature", source: "IRENA (2024)" },
  { group: "Energy", item: "Coal and gas cost", value: "US$70 and US$80 per MWh", basis: "Assumption", source: "Teaching values" },
  { group: "Energy", item: "Life-cycle CO₂ (coal, gas, solar, hydro)", value: "820, 490, 48, 24 g/kWh", basis: "Literature", source: "IPCC AR5 WGIII Annex III (2014), medians" },
  { group: "Energy", item: "Solar land use", value: "2 ha per GWh/yr", basis: "Literature", source: "Ong et al. (2013), NREL/TP-6A20-56290, at a 20% capacity factor" },
  { group: "Energy", item: "Solar grid limit without storage", value: `${option("solar").maxBlocks} TWh/yr`, basis: "Assumption", source: "Teaching value" },
  { group: "Energy", item: "Reservoir area per dam", value: `${(per("hydro").landMha! * 1e6).toLocaleString("en-GB")} ha`, basis: "Assumption", source: "Teaching value" },
];
