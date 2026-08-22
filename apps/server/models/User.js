import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

export const User = {
  findUnique: (args) => prisma.user.findUnique(args),
  findFirst: (args) => prisma.user.findFirst(args),
  findMany: (args) => prisma.user.findMany(args),
  create: (args) => prisma.user.create(args),
  update: (args) => prisma.user.update(args),
  delete: (args) => prisma.user.delete(args),
  verifyPassword: async (userObj, candidatePassword) => {
    if (!userObj || !userObj.passwordHash) return false;
    return await bcrypt.compare(candidatePassword, userObj.passwordHash);
  },
};

export default User;
