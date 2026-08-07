import { useEffect, useState } from "react";

/** Returns a time-of-day greeting in Asia/Kolkata. */
export function useFinanceGreeting() {
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    const hour = Number(
      new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }).format(new Date()),
    );
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  }, []);

  return greeting;
}