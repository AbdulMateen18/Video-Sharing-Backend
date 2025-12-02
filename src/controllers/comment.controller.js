import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Validate video ID
  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Check if video exists
  const videoExists = await Video.findById(videoId);
  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Use aggregation pipeline to populate owner details
  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: parseInt(limit) },
  ]);

  // Get total count for pagination
  const totalComments = await Comment.countDocuments({ video: videoId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalComments / parseInt(limit)),
          totalComments,
          limit: parseInt(limit),
        },
      },
      "Video comments fetched successfully"
    )
  );
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;
  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  // Check if video exists
  const videoExists = await Video.findById(videoId);
  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }
  const newComment = await Comment.create({
    content,
    video: videoId,
    owner: userId,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, newComment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;
  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  if (!content) {
    throw new ApiError(400, "Content is required to update comment");
  }
  const comment = await Comment.findById(commentId).populate(
    "owner",
    "fullName username avatar"
  );
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (comment.owner._id.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }
  comment.content = content;
  await comment.save();
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  const userId = req.user._id;
  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (comment.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }
  await Comment.findByIdAndDelete(commentId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
