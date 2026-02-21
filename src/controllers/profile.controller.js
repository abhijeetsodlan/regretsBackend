import { Question } from "../models/question.model.js";
import { SavedPost } from "../models/saved-post.model.js";

export async function myProfile(req, res, next) {
  try {
    const uploadedPosts = await Question.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select("title")
      .lean();

    const savedRows = await SavedPost.find({ user: req.user._id })
      .populate("question", "title")
      .sort({ createdAt: -1 })
      .lean();
    const savedPosts = savedRows
      .filter((row) => row.question)
      .map((row) => ({
        id: row.question._id.toString(),
        title: row.question.title
      }));

    res.json({
      data: {
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar || "",
        uploaded_posts: uploadedPosts.map((post) => ({
          id: post._id.toString(),
          title: post.title
        })),
        saved_posts: savedPosts
      }
    });
  } catch (err) {
    next(err);
  }
}
