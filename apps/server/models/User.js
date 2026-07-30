import bcrypt from 'bcryptjs';

// In-memory user store for dev/testing when MongoDB connection is not configured
const usersByEmail = new Map();
const usersById = new Map();

export class User {
  static async create({ email, password, name }) {
    const normalizedEmail = email.toLowerCase().trim();
    if (usersByEmail.has(normalizedEmail)) {
      throw new Error('USER_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    const userObj = {
      id,
      email: normalizedEmail,
      name: name || '',
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    usersByEmail.set(normalizedEmail, userObj);
    usersById.set(id, userObj);

    return { id: userObj.id, email: userObj.email, name: userObj.name };
  }

  static async findByEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    return usersByEmail.get(normalizedEmail) || null;
  }

  static async findById(id) {
    const user = usersById.get(id);
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name };
  }

  static async verifyPassword(userObj, candidatePassword) {
    if (!userObj || !userObj.passwordHash) return false;
    return await bcrypt.compare(candidatePassword, userObj.passwordHash);
  }
}
