import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import User, { UserRole } from '../models/user.model.js';
import Hospital from '../models/hospital.model.js';
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

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response) => {
  try {
    const { email, fullName, password, role, phone, profileImageUrl } = req.body;

    if (!email || !fullName || !password) {
      res.status(400).json({ message: 'email, fullName and password are required' });
      return;
    }

    // DEV: auto-resolve a default hospital so registration needs no hospital fields
    const DEV_HOSPITAL_CODE = 'DEV_DEFAULT';
    let devHospital = await Hospital.findOne({ code: DEV_HOSPITAL_CODE }).select('_id');
    if (!devHospital) {
      devHospital = await Hospital.create({
        name: 'Development Hospital',
        code: DEV_HOSPITAL_CODE,
      });
    }
    const resolvedHospitalId = String(devHospital._id);

    const normalizedRole: string = typeof role === 'string' && role.trim() ? role.trim() : UserRole.DOCTOR;

    const existingUser = await User.findOne({
      hospitalId: resolvedHospitalId,
      email,
    });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists with this email' });
      return;
    }

    const user = await User.create({
      hospitalId: resolvedHospitalId,
      email,
      fullName,
      passwordHash: password, // will be hashed by pre-save hook
      role: normalizedRole,
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

export const enrollVoice = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: 'Audio file is required' });
      return;
    }

    const fileBuffer = await fs.readFile(req.file.path);
    const blob = new Blob([fileBuffer], { type: req.file.mimetype || 'audio/webm' });

    const formData = new FormData();
    formData.append('file', blob, req.file.originalname || 'enrollment.webm');

    const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    const aiResponse = await fetch(`${AI_URL}/api/ai/enroll-voice`, {
      method: 'POST',
      body: formData,
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      res.status(aiResponse.status).json({ message: `AI Service Error: ${errText}` });
      return;
    }

    const aiData = await aiResponse.json() as { status: string; embedding: number[] };

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { voiceEmbedding: aiData.embedding },
      { new: true }
    ).select('-passwordHash');

    res.json({ 
      message: 'Voice enrolled successfully', 
      user: updatedUser 
    });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to enroll voice';
    res.status(500).json({ message });
    return;
  }
};

export const deleteVoice = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { voiceEmbedding: 1 } },
      { new: true }
    ).select('-passwordHash');

    res.json({ 
      message: 'Voice mapping deleted successfully', 
      user: updatedUser 
    });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete voice mapping';
    res.status(500).json({ message });
    return;
  }
};
