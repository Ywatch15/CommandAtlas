import mongoose from 'mongoose';

const zeroResultQuerySchema = new mongoose.Schema(
  {
    queryText: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    count: {
      type: Number,
      default: 1,
    },
    lastQueriedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const ZeroResultQuery =
  mongoose.models.ZeroResultQuery || mongoose.model('ZeroResultQuery', zeroResultQuerySchema);
