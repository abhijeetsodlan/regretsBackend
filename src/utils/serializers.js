export function toPublicUser(userDoc) {
  if (!userDoc) {
    return null;
  }
  return {
    id: userDoc._id.toString(),
    name: userDoc.name,
    email: userDoc.email,
    avatar: userDoc.avatar || ""
  };
}

export function toQuestionDTO(questionDoc, options = {}) {
  const {
    likesCount = 0,
    likedByUser = false,
    isSaved = false,
    repliesCount = 0
  } = options;

  const user = questionDoc.is_anonymous
    ? null
    : toPublicUser(questionDoc.user);

  return {
    id: questionDoc._id.toString(),
    title: questionDoc.title,
    is_anonymous: Boolean(questionDoc.is_anonymous),
    user,
    category_id: questionDoc.category ? questionDoc.category.toString() : null,
    created_at: questionDoc.createdAt,
    likes_count: likesCount,
    liked_by_user: likedByUser,
    is_saved: isSaved,
    replies_count: repliesCount
  };
}

export function toCommentDTO(commentDoc) {
  const user = commentDoc.is_anonymous
    ? null
    : toPublicUser(commentDoc.user);

  return {
    id: commentDoc._id.toString(),
    title: commentDoc.title,
    is_anonymous: Boolean(commentDoc.is_anonymous),
    user,
    created_at: commentDoc.createdAt
  };
}
