type Nullish = null | undefined;

const is = {
  // @ts-expect-error: ignore
  nullish: <T>(value: T): value is Nullish => value === null || value === undefined,
};

export default is;
