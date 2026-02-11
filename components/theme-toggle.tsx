"use client";

import { useEffect, useState } from "react";

const KEY = "quest-board-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"day" | "night">("day");

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as "day" | "night" | null;
    const nextTheme = saved ?? "day";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, []);

  const toggle = () => {
    const nextTheme = theme === "day" ? "night" : "day";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem(KEY, nextTheme);
  };

  return (
    <button className="btn" type="button" onClick={toggle}>
      {theme === "day" ? "夜の酒場" : "昼の掲示板"}
    </button>
  );
}
