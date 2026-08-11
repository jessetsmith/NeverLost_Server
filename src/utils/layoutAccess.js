function normalizeUserId(userId) {
  return userId ? String(userId).trim() : "";
}

function getCollaborator(layout, userId) {
  const normalized = normalizeUserId(userId);
  return (layout.collaborators || []).find(
      (entry) => normalizeUserId(entry.userId) === normalized,
  );
}

function getAcceptedCollaboratorRole(collaborator) {
  if (!collaborator || collaborator.status !== "accepted") {
    return null;
  }

  const role = collaborator.role || "editor";
  return role === "viewer" ? "viewer" : "editor";
}

function getLayoutRole(layout, userId) {
  if (!layout || !userId) {
    return null;
  }

  if (normalizeUserId(layout.userId) === normalizeUserId(userId)) {
    return "owner";
  }

  const collaborator = getCollaborator(layout, userId);
  const collaboratorRole = getAcceptedCollaboratorRole(collaborator);
  if (collaboratorRole) {
    return collaboratorRole;
  }

  if (layout.visibility === "published") {
    return "viewer";
  }

  return null;
}

function canReadLayout(layout, userId) {
  return getLayoutRole(layout, userId) !== null;
}

function canEditLayout(layout, userId) {
  const role = getLayoutRole(layout, userId);
  return role === "owner" || role === "editor";
}

function canManageCollaborators(layout, userId) {
  return normalizeUserId(layout?.userId) === normalizeUserId(userId);
}

function canPublish(layout, userId) {
  return normalizeUserId(layout?.userId) === normalizeUserId(userId);
}

function formatLayoutSummary(layout, role, extra = {}) {
  return {
    _id: layout._id,
    layoutId: layout._id,
    name: layout.name,
    description: layout.description,
    objects: layout.objects || [],
    sceneSettings: layout.sceneSettings || null,
    layoutDimensions: layout.layoutDimensions || null,
    userId: layout.userId,
    visibility: layout.visibility || "private",
    publishedAt: layout.publishedAt || null,
    collaborators: layout.collaborators || [],
    role,
    ...extra,
  };
}

function formatLayoutResponse(layout, role) {
  return formatLayoutSummary(layout, role);
}

module.exports = {
  getCollaborator,
  getLayoutRole,
  canReadLayout,
  canEditLayout,
  canManageCollaborators,
  canPublish,
  formatLayoutSummary,
  formatLayoutResponse,
};
