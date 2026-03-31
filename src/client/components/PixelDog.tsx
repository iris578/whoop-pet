import React from "react";

// Multi-shade palette for detailed pixel art dog
const PALETTE: Record<string, string> = {
  ".": "transparent",
  "x": "#1a1210", // black outline
  "d": "#8B5E34", // dark brown
  "#": "#c88a32", // medium brown (main body)
  "@": "#e8a840", // light golden
  "w": "#f5efe0", // white/cream (chest, muzzle)
  "W": "#e8dcc8", // off-white shadow
  "o": "#FFFFFF", // eye white
  "e": "#1a1210", // eye pupil (same as outline)
  "n": "#2a1a10", // nose
  "p": "#e86080", // pink tongue
  "P": "#d05070", // dark pink tongue shadow
  "r": "#d44040", // red (danger)
  "g": "#50b860", // green (sparkle)
  "y": "#f0c030", // yellow (crown)
  "Y": "#d4a020", // dark yellow
  "z": "#a8a098", // gray (dead body)
  "Z": "#888078", // dark gray (dead shadow)
  "b": "#6090d0", // blue (zzz)
  "c": "#d0a060", // collar
  "s": "#7dd8e8", // light cyan (egg spot)
  "S": "#4da8d0", // blue (egg spot)
};

type Mood = "thriving" | "happy" | "neutral" | "tired" | "struggling" | "dead";
type Stage = "egg" | "baby" | "teen" | "adult" | "legendary";

// Sitting dog, front-facing, ~20x20 grid. Cute proportions: big head, small body.
// Inspired by the reference: black outlines, shaded fur, white chest.

const DOG_HAPPY: string[] = [
  "........xxxxxx..........",
  "......xx######xx........",
  ".....x##########x.......",
  "..xxxx####@@####xxxx....",
  ".x##x#####@@#####x##x...",
  ".x###x##oe##eo##x###x...",
  ".x####x##nn####x####x...",
  "..x###x##wwww##x###x....",
  "..xxxx###wwww###xxxx.....",
  "....x####wwww####x......",
  "....x##cccccccc##x......",
  "....x##wwwwwwww##x......",
  "....x##wwwwwwww##x......",
  "....x####wwww####x......",
  "....x####wwww####x......",
  "....xx##x....x##xx......",
  ".....x##x....x##x.......",
  ".....xxxx....xxxx........",
];

const DOG_THRIVING: string[] = [
  "....g...xxxxxx......g...",
  "......xx######xx........",
  ".....x##########x.......",
  "..xxxx####@@####xxxx....",
  ".x##x#####@@#####x##x...",
  ".x###x##oe##eo##x###x...",
  ".x####x##nn####x####x...",
  "..x###x##wwww##x###x....",
  "..xxxx###wppw###xxxx.....",
  "....x####wwww####x......",
  "....x##cccccccc##x......",
  "....x##wwwwwwww##x......",
  "....x##wwwwwwww##x......",
  "....x####wwww####x......",
  "....x####wwww####x......",
  "....xx##x....x##xx......",
  ".....x##x....x##x.......",
  ".....xxxx....xxxx........",
];

const DOG_NEUTRAL: string[] = [
  "........xxxxxx..........",
  "......xx######xx........",
  ".....x##########x.......",
  "..xxxx####@@####xxxx....",
  ".x##x#####@@#####x##x...",
  ".x###x##oe##eo##x###x...",
  ".x####x##nn####x####x...",
  "..x###x##wwww##x###x....",
  "..xxxx###xxxx###xxxx.....",
  "....x####wwww####x......",
  "....x##cccccccc##x......",
  "....x##wwwwwwww##x......",
  "....x##wwwwwwww##x......",
  "....x####wwww####x......",
  "....x####wwww####x......",
  "....xx##x....x##xx......",
  ".....x##x....x##x.......",
  ".....xxxx....xxxx........",
];

const DOG_TIRED: string[] = [
  "........xxxxxx......bbb.",
  "......xx######xx...b....",
  ".....x##########x.......",
  "..xxxx####@@####xxxx....",
  ".x##x#####@@#####x##x...",
  ".x###x##xx##xx##x###x...",
  ".x####x##nn####x####x...",
  "..x###x##wwww##x###x....",
  "..xxxx###xxxx###xxxx.....",
  "....x####wwww####x......",
  "....x##cccccccc##x......",
  "....x##wwwwwwww##x......",
  "....x##wwwwwwww##x......",
  "....x####wwww####x......",
  "....x####wwww####x......",
  "....xx##x....x##xx......",
  ".....x##x....x##x.......",
  ".....xxxx....xxxx........",
];

const DOG_STRUGGLING: string[] = [
  "..r.....xxxxxx..........",
  "......xx######xx........",
  ".....x##########x.......",
  "..xxxx####@@####xxxx....",
  ".x##x#####@@#####x##x...",
  ".x###x##oe##eo##x###x...",
  ".x####x##nn####x####x...",
  "..x###x##wwww##x###x....",
  "..xxxx##wwrrrww##xxxx...",
  "....x####wwww####x......",
  "....x##cccccccc##x......",
  "....x##wwwwwwww##x......",
  "....x##wwwwwwww##x......",
  "....x####wwww####x......",
  "....x####wwww####x......",
  "....xx##x....x##xx......",
  ".....x##x....x##x.......",
  ".....xxxx....xxxx........",
];

const DOG_DEAD: string[] = [
  "........xxxxxx..........",
  "......xxzzzzzzxx........",
  ".....xzzzzzzzzzzx.......",
  "..xxxxzzzzzzzzzzzxxxx...",
  ".xzzxzzzzzzzzzzzzzxzzx..",
  ".xzzzxzzxezzzexzzxzzzx..",
  ".xzzzzxzznnzzzzxzzzzx...",
  "..xzzzxzzwwwwzzxzzzx....",
  "..xxxxzzzxxxxzzzxxxx.....",
  "....xzzzzwwwwzzzzx......",
  "....xzzzzzzzzzzzzx......",
  "....xzzwwwwwwwwzzx......",
  "....xzzwwwwwwwwzzx......",
  "....xzzzzwwwwzzzzx......",
  "....xzzzzwwwwzzzzx......",
  "....xxzzx....xzzxx......",
  ".....xzzx....xzzx.......",
  ".....xxxx....xxxx........",
];

// White egg with blue/cyan spots, tall oval, black outline
// s = light cyan spot, S = blue spot, w = white shell, W = light shadow
const EGG: string[] = [
  "..........xxxx..........",
  "........xxxxxxxx........",
  ".......xxwwwwwwxx.......",
  "......xwwwwwwswwwx......",
  ".....xwwwwwwwsswwwx.....",
  ".....xwwwSwwwwwwwwx.....",
  "....xwwwSSwwwwwwwwwx....",
  "....xwwwwwwwwSwwwwwx....",
  "....xwwwwwwwSSwwwwwx....",
  "....xwwwwSwwwwwwwwwx....",
  "....xwwwSSwwwwwSwwwx....",
  "....xwwwwwwwwwSSwwwx....",
  ".....xwwwwwwwwwwwwx.....",
  ".....xWWWWWWWWWWWWx.....",
  "......xWWWWWWWWWWx......",
  ".......xxWWWWWWxx.......",
  "........xxxxxxxx........",
  ".........xxxxxx..........",
];

const EGG_THRIVING: string[] = [
  "..g.......xxxx......g...",
  "........xxxxxxxx........",
  ".......xxwwwwwwxx.......",
  "......xwwwwwwswwwx......",
  ".....xwwwwwwwsswwwx.....",
  ".....xwwwSwwwwwwwwx.....",
  "....xwwwSSwwwwwwwwwx....",
  "....xwwwwwwwwSwwwwwx....",
  "....xwwwwwwwSSwwwwwx....",
  "....xwwwwSwwwwwwwwwx....",
  "....xwwwSSwwwwwSwwwx....",
  "....xwwwwwwwwwSSwwwx....",
  ".....xwwwwwwwwwwwwx.....",
  ".....xWWWWWWWWWWWWx.....",
  "......xWWWWWWWWWWx......",
  ".......xxWWWWWWxx.......",
  "........xxxxxxxx........",
  ".........xxxxxx..........",
];

const EGG_DEAD: string[] = [
  "..........xxxx..........",
  "........xxxxxxxx........",
  ".......xxzzzzzzxx.......",
  "......xzzzzzzzzzzx......",
  ".....xzzzzzzzzzzzzx.....",
  ".....xzzzzzzzzzzzzx.....",
  "....xzzzzzzzzzzzzzzx....",
  "....xzzzzzzzzzzzzzzx....",
  "....xzzzzzzzzzzzzzzx....",
  "....xzzzzzzzzzzzzzzx....",
  "....xzzzzzzzzzzzzzzx....",
  "....xzzzzzzzzzzzzzzx....",
  ".....xzzzzzzzzzzzzx.....",
  ".....xZZZZZZZZZZZZx.....",
  "......xZZZZZZZZZZx......",
  ".......xxZZZZZZxx.......",
  "........xxxxxxxx........",
  ".........xxxxxx..........",
];

const DOG_MOODS: Record<Mood, string[]> = {
  thriving: DOG_THRIVING,
  happy: DOG_HAPPY,
  neutral: DOG_NEUTRAL,
  tired: DOG_TIRED,
  struggling: DOG_STRUGGLING,
  dead: DOG_DEAD,
};

const EGG_MOODS: Record<Mood, string[]> = {
  thriving: EGG_THRIVING,
  happy: EGG,
  neutral: EGG,
  tired: EGG,
  struggling: EGG,
  dead: EGG_DEAD,
};

const DOGS: Record<Stage, Record<Mood, string[]>> = {
  egg: EGG_MOODS,
  baby: DOG_MOODS,
  teen: DOG_MOODS,
  adult: DOG_MOODS,
  legendary: DOG_MOODS,
};

interface PixelDogProps {
  mood: string;
  evolutionStage: string;
  isAlive: boolean;
}

export function PixelDog({ mood, evolutionStage, isAlive }: PixelDogProps) {
  const stage = (evolutionStage || "egg") as Stage;
  const m = (isAlive ? (mood || "neutral") : "dead") as Mood;
  const grid = DOGS[stage]?.[m] || DOGS.egg.neutral;
  const px = stage === "egg" ? 7 : 5;

  return (
    <div style={{ display: "inline-block", imageRendering: "pixelated" as any }}>
      {grid.map((row, y) => (
        <div key={y} style={{ display: "flex", height: px }}>
          {row.split("").map((ch, x) => (
            <div
              key={x}
              style={{
                width: px,
                height: px,
                backgroundColor: PALETTE[ch] || "transparent",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
