export function momentumFilter(momentum) {
  // Block signals when momentum is completely neutral
  return momentum.bias !== "NEUTRAL";
}
