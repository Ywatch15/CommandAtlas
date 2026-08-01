import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    commandSlug: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

bookmarkSchema.index({ userId: 1, commandSlug: 1 }, { unique: true });

export const Bookmark = mongoose.models.Bookmark || mongoose.model('Bookmark', bookmarkSchema);
