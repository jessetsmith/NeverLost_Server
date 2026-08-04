async function findUserByEmailOrUsername(sanityClient, {email, username}) {
  if (email) {
    const query = `*[_type == "user" && email == $email][0]{ _id, username, email }`;
    return sanityClient.fetch(query, {email: email.trim().toLowerCase()});
  }

  if (username) {
    const query = `*[_type == "user" && username == $username][0]{ _id, username, email }`;
    return sanityClient.fetch(query, {username: username.trim()});
  }

  return null;
}

async function getUserSummary(sanityClient, userId) {
  const query = `*[_type == "user" && _id == $userId][0]{
    _id,
    username,
    email,
    title,
    bio,
    profileImageUrl
  }`;
  return sanityClient.fetch(query, {userId});
}

module.exports = {
  findUserByEmailOrUsername,
  getUserSummary,
};
