import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
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
    content: {
      type: String,
      required: true,
      default: '',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ userId: 1, commandSlug: 1 });

export const Note = mongoose.models.Note || mongoose.model('Note', noteSchema);
