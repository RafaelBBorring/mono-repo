declare module "animejs" {
  export type AnimeEasing =
    | "linear"
    | "easeInQuad"
    | "easeOutQuad"
    | "easeInOutQuad"
    | "easeInCubic"
    | "easeOutCubic"
    | "easeInOutCubic"
    | "easeInExpo"
    | "easeOutExpo"
    | "easeInOutExpo"
    | "easeOutElastic"
    | "easeInBack"
    | "easeOutBack"
    | string;

  export interface AnimeParams {
    targets?: unknown;
    duration?: number;
    delay?: number;
    easing?: AnimeEasing;
    loop?: boolean | number;
    direction?: "normal" | "reverse" | "alternate";
    update?: (() => void) | undefined;
    complete?: (() => void) | undefined;
    [key: string]: unknown;
  }

  export interface AnimeInstance {
    pause: () => void;
    play: () => void;
    restart: () => void;
  }

  const anime: (params: AnimeParams) => AnimeInstance;
  export default anime;
}
