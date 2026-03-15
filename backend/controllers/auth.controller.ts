import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import  { generateToken } from '../security/jwt-util.js'; // adjust path

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ message: 'Account is inactive or suspended' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(String(user._id));

    const { passwordHash: _passwordHash, ...userResponse } = user.toObject();

    res.json({ token, user: userResponse });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to login';
    res.status(500).json({ message });
    return;
  }
};

// @desc    Register new user (admin only)
// @route   POST /api/auth/register
// @access  Private/Admin
export const register = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { email, fullName, password, role, phone, profileImageUrl } = req.body;

    const existingUser = await User.findOne({
      hospitalId: req.user.hospitalId,
      email,
    });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists with this email' });
      return;
    }

    const user = await User.create({
      hospitalId: req.user.hospitalId,
      email,
      fullName,
      passwordHash: password, // will be hashed by pre-save hook
      role,
      phone,
      profileImageUrl,
      emailVerified: false,
      status: 'ACTIVE',
    });

    const { passwordHash: _passwordHash, ...userResponse } = user.toObject();

    res.status(201).json(userResponse);
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to register user';
    res.status(500).json({ message });
    return;
  }
};

// @desc    Get current user profile (from token)
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const user = await User.findById(req.user._id).select('-passwordHash');
    res.json(user);
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch profile';
    res.status(500).json({ message });
    return;
  }
};

// @desc    Logout (client discards token)
// @route   POST /api/auth/logout
// @access  Private
export const logout = (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
  return;
};