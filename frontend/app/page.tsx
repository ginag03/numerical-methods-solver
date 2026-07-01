"use client"; // tells Next.js we need browser interactivity

import { useState } from "react";

type Equation = "decay" | "lotka_volterra";
type Method = "rk4" | "euler";

interface SolverRequest {
  equation: Equation;
  method: Method;
  dt: number;
  t_end: number;
  y0: number[];
  k: number;
}

export default function Home() {
  // state management for inputs
  const [equation, setEquation] = useState<Equation>("decay");
  const [method, setMethod] = useState<Method>("rk4");
  const [dt, setDt] = useState("0.1");
  const [tMax, setTMax] = useState("5");
  const [k, setK] = useState("0.1");
  const [y0String, setY0String] = useState("1.0"); // stored as string for text input
  const [error, setError] = useState<string | null>(null);

  const handleSolve = () => {
    // validation and submission engine
    setError(null); // reset error state on new attempts

    // parse y0 input
    const y0Array = y0String.split(",").map((num) => parseFloat(num.trim()));

    // check: were actual numbers entered for y0?
    if (y0Array.some((num) => Number.isNaN(num))) {
      setError("Invalid input for y0: please enter a comma-separated list of numbers (e.g., 0.9, 0.9)");
      return;
    }

    // check: were the right number if ICs provided?
    if (equation === "decay" && y0Array.length !== 1) {
      setError("Decay equation requires exactly one initial condition (e.g., 1.0)");
      return;
    }

    if (equation === "lotka_volterra" && y0Array.length !== 2) {
      setError("Lotka-Volterra equation requires exactly two initial conditions (e.g., 0.9, 0.9)");
      return;
    }
    
    const dtNum = parseFloat(dt);
    const tMaxNum = parseFloat(tMax);
    const kNum = parseFloat(k);
    // check: were dt, tMax, and k valid numbers?
    if (Number.isNaN(dtNum)) {
      setError("Invalid input for dt: please enter a valid number.");
      return;
    }

    if (Number.isNaN(tMaxNum)) {
      setError("Invalid input for tMax: please enter a valid number.");
      return;
    }

    if (Number.isNaN(kNum)) {
      setError("Invalid input for k: please enter a valid number.");
      return;
    }

    if (dtNum <= 0) {
      setError("dt must be greater than 0.");
      return;
    }

    if (tMaxNum <= 0) {
      setError("tMax must be greater than 0.");
      return;
    }

    if (kNum < 0) {
      setError("k must be non-negative.");
      return;
    }

    // if validation is passed, prepare the payload for submission
    const payload: SolverRequest = {
      equation,
      method,
      dt: dtNum,
      t_end: tMaxNum,
      y0: y0Array,
      k: kNum
    };

    console.log("Ready to send to FastAPI:", payload);
  };

  return(
    <main>

    </main>
  );
}

