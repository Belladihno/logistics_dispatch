import * as argon2 from 'argon2';

export const Hash = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
};

export const verifyHash = async (
  hash: string,
  password: string,
): Promise<boolean> => {
  return argon2.verify(hash, password);
};
