import mongoose from 'mongoose';

const contributionSchema = new mongoose.Schema(
  {
    prNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    prUrl: {
      type: String,
      required: true,
    },
    contributorHandle: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'approved', 'merged', 'rejected'],
      default: 'open',
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Contribution =
  mongoose.models.Contribution || mongoose.model('Contribution', contributionSchema);
