interface PulsingDotProps {
  color?: "green" | "red" | "amber" | "violet" | "blue";
  size?: "sm" | "md";
}

const colorMap = {
  green: "bg-green",
  red: "bg-destructive",
  amber: "bg-amber-500",
  violet: "bg-violet",
  blue: "bg-blue",
};

const ringColorMap = {
  green: "bg-green/40",
  red: "bg-destructive/40",
  amber: "bg-amber-500/40",
  violet: "bg-violet/40",
  blue: "bg-blue/40",
};

export function PulsingDot({ color = "green", size = "sm" }: PulsingDotProps) {
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  const ringSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <span className="relative inline-flex">
      <span
        className={`${ringSize} ${ringColorMap[color]} rounded-full animate-ping absolute inline-flex opacity-75`}
      />
      <span
        className={`${dotSize} ${colorMap[color]} rounded-full relative inline-flex`}
      />
    </span>
  );
}
