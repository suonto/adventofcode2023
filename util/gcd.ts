// couple of utilities from
// https://stackoverflow.com/questions/47047682/least-common-multiple-of-an-array-values-using-euclidean-algorithm
export const gcd = (a, b) => (a ? gcd(b % a, a) : b);
export const lcm = (a, b) => (a * b) / gcd(a, b);
