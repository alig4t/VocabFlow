import valueParser from "postcss-value-parser";

export interface LengthContext {
  width: number;
  height: number;
  font: number;
  rootFont: number;
  percent: number;
  variable: (name: string) => string;
}

/** Evaluate CSS lengths without eval(), preserving min/max/clamp bounds. */
export function cssLength(
  expression: string,
  context: LengthContext,
): number | null {
  let depth = 0;
  const sequence = (nodes: valueParser.Node[]): number => {
    const tokens = nodes.filter(
      (node) => node.type !== "space" && node.type !== "comment",
    );
    let cursor = 0;
    const atom = (): number => {
      const node = tokens[cursor++];
      if (!node) return NaN;
      if (node.type === "word" && (node.value === "-" || node.value === "+"))
        return (node.value === "-" ? -1 : 1) * atom();
      if (node.type === "function") {
        const args: valueParser.Node[][] = [[]];
        for (const child of node.nodes) {
          if (child.type === "div" && child.value === ",") args.push([]);
          else args[args.length - 1].push(child);
        }
        if (node.value === "var") {
          const name = valueParser.stringify(args[0]).trim();
          const raw =
            context.variable(name) || valueParser.stringify(args[1] ?? []);
          if (!raw || ++depth > 30) return NaN;
          const result = sequence(valueParser(raw).nodes);
          depth--;
          return result;
        }
        if (node.value === "env") return args[1] ? sequence(args[1]) : 0;
        const values = args.map(sequence);
        if (node.value === "calc" || node.value === "") return values[0];
        if (node.value === "min") return Math.min(...values);
        if (node.value === "max") return Math.max(...values);
        if (node.value === "clamp" && values.length === 3)
          return Math.max(values[0], Math.min(values[1], values[2]));
        return NaN;
      }
      if (node.type !== "word") return NaN;
      const unit = valueParser.unit(node.value);
      if (!unit) return NaN;
      const value = Number(unit.number);
      const scales: Record<string, number> = {
        "": 1,
        px: 1,
        rem: context.rootFont,
        em: context.font,
        "%": context.percent / 100,
        vh: context.height / 100,
        dvh: context.height / 100,
        vw: context.width / 100,
        dvw: context.width / 100,
        vmin: Math.min(context.width, context.height) / 100,
        vmax: Math.max(context.width, context.height) / 100,
        pt: 96 / 72,
        pc: 16,
        in: 96,
        cm: 96 / 2.54,
        mm: 96 / 25.4,
      };
      return value * (scales[unit.unit] ?? NaN);
    };
    const product = (): number => {
      let result = atom();
      while (tokens[cursor]?.value === "*" || tokens[cursor]?.value === "/") {
        const operator = tokens[cursor++].value;
        const next = atom();
        result = operator === "*" ? result * next : result / next;
      }
      return result;
    };
    let result = product();
    while (cursor < tokens.length) {
      const operator = tokens[cursor++].value;
      if (operator !== "+" && operator !== "-") return NaN;
      const next = product();
      result = operator === "+" ? result + next : result - next;
    }
    return result;
  };
  const result = sequence(valueParser(expression).nodes);
  return Number.isFinite(result) ? result : null;
}
