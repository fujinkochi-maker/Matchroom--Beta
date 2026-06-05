import { recalculateAll, recalculateDivision } from "../src/data/rankings";

console.log("Running recalculateAll...");
recalculateAll()
  .then(() => console.log("recalculateAll completed"))
  .catch((err) => console.error("recalculateAll error:", err));
