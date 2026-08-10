export const schemaTypes = [
  {
    name: 'layout',
    title: 'Layout',
    type: 'document',
    fields: [
      {
        name: 'name',
        title: 'Layout Name',
        type: 'string',
      },
      {
        name: 'description',
        title: 'Description',
        type: 'string',
      },
      {
        name: 'userId',
        title: 'User ID',
        type: 'string',
      },
      {
        name: 'user',
        title: 'User',
        type: 'reference',
        to: [{type: 'user'}],
      },
      {
        name: 'visibility',
        title: 'Visibility',
        type: 'string',
        options: {list: ['private', 'published']},
        initialValue: 'private',
      },
      {
        name: 'publishedAt',
        title: 'Published At',
        type: 'datetime',
      },
      {
        name: 'collaborators',
        title: 'Collaborators',
        type: 'array',
        of: [
          {
            type: 'object',
            fields: [
              {name: 'userId', type: 'string', title: 'User ID'},
              {name: 'role', type: 'string', title: 'Role', options: {list: ['editor', 'viewer']}},
              {
                name: 'status',
                type: 'string',
                title: 'Status',
                options: {list: ['pending', 'accepted', 'declined']},
              },
              {name: 'invitedBy', type: 'string', title: 'Invited By'},
              {name: 'invitedAt', type: 'datetime', title: 'Invited At'},
              {name: 'respondedAt', type: 'datetime', title: 'Responded At'},
            ],
          },
        ],
      },
      {
        name: 'sceneSettings',
        title: 'Scene Settings',
        type: 'object',
        fields: [
          {name: 'backgroundColor', title: 'Background Color', type: 'string'},
          {name: 'groundColor', title: 'Ground Color', type: 'string'},
          {name: 'skyColor', title: 'Sky Color', type: 'string'},
          {name: 'lightColor', title: 'Light Color', type: 'string'},
          {name: 'lightIntensity', title: 'Light Intensity', type: 'number'},
          {name: 'ambientIntensity', title: 'Ambient Intensity', type: 'number'},
          {name: 'accentColor', title: 'Accent Color', type: 'string'},
          {name: 'fillLightColor', title: 'Fill Light Color', type: 'string'},
          {name: 'fogEnabled', title: 'Fog Enabled', type: 'boolean'},
        ],
      },
      {
        name: 'objects',
        title: 'Objects',
        type: 'array',
        of: [
          {
            type: 'object',
            fields: [
              {name: 'key', type: 'string', title: 'Key'},
              {name: 'id', type: 'string', title: 'Object ID'},
              {name: 'type', type: 'string', title: 'Object Type'},
              {name: 'name', type: 'string', title: 'Object Name'},
              {
                name: 'assetUrl',
                title: '3D Asset URL',
                type: 'url',
              },
              {
                name: 'color',
                title: 'Color',
                type: 'string', // Use string for color hex
              },
              {
                name: 'opacity',
                title: 'Opacity',
                type: 'number',
              },
              {
                name: 'position',
                title: 'Position',
                type: 'object',
                fields: [
                  {name: 'x', type: 'number', title: 'X'},
                  {name: 'y', type: 'number', title: 'Y'},
                  {name: 'z', type: 'number', title: 'Z'},
                ],
              },
              {
                name: 'rotation',
                title: 'Rotation',
                type: 'object',
                fields: [
                  {name: 'x', type: 'number', title: 'X'},
                  {name: 'y', type: 'number', title: 'Y'},
                  {name: 'z', type: 'number', title: 'Z'},
                ],
              },
              {
                name: 'scale',
                title: 'Scale',
                type: 'object',
                fields: [
                  {name: 'x', type: 'number', title: 'X'},
                  {name: 'y', type: 'number', title: 'Y'},
                  {name: 'z', type: 'number', title: 'Z'},
                ],
              },
              {
                name: 'notes',
                title: 'Notes',
                type: 'text',
              },
              {
                name: 'properties',
                title: 'Properties',
                type: 'array',
                of: [
                  {
                    type: 'object',
                    fields: [
                      {name: 'key', type: 'string', title: 'Key'},
                      {name: 'value', type: 'string', title: 'Value'},
                    ],
                  },
                ],
              },
              {
                name: 'log',
                title: 'Log',
                type: 'array',
                of: [
                  {
                    type: 'object',
                    fields: [
                      {name: 'message', type: 'text', title: 'Message'},
                      {name: 'createdAt', type: 'datetime', title: 'Created At'},
                    ],
                  },
                ],
              },
              {
                name: 'sketchfabCredit',
                title: 'Sketchfab Credit',
                type: 'object',
                fields: [
                  {name: 'modelName', type: 'string', title: 'Model Name'},
                  {name: 'modelUrl', type: 'url', title: 'Model URL'},
                  {name: 'authorName', type: 'string', title: 'Author Name'},
                  {name: 'authorUrl', type: 'url', title: 'Author URL'},
                  {name: 'licenseLabel', type: 'string', title: 'License Label'},
                  {name: 'licenseUrl', type: 'url', title: 'License URL'},
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'userAsset',
    title: 'User Asset',
    type: 'document',
    fields: [
      {name: 'userId', title: 'User ID', type: 'string'},
      {name: 'name', title: 'Name', type: 'string'},
      {name: 'assetUrl', title: '3D Asset URL', type: 'url'},
      {
        name: 'source',
        title: 'Source',
        type: 'string',
        options: {list: ['upload', 'sketchfab', 'url']},
      },
      {name: 'thumbnailUrl', title: 'Thumbnail URL', type: 'url'},
      {name: 'sketchfabUid', title: 'Sketchfab UID', type: 'string'},
      {
        name: 'sketchfabCredit',
        title: 'Sketchfab Credit',
        type: 'object',
        fields: [
          {name: 'modelName', title: 'Model Name', type: 'string'},
          {name: 'modelUrl', title: 'Model URL', type: 'url'},
          {name: 'authorName', title: 'Author Name', type: 'string'},
          {name: 'authorUrl', title: 'Author URL', type: 'url'},
          {name: 'licenseLabel', title: 'License Label', type: 'string'},
          {name: 'licenseUrl', title: 'License URL', type: 'url'},
        ],
      },
      {name: 'originalName', title: 'Original Filename', type: 'string'},
      {name: 'createdAt', title: 'Created At', type: 'datetime'},
    ],
  },
  {
    name: 'notification',
    title: 'Notification',
    type: 'document',
    fields: [
      {name: 'recipientUserId', title: 'Recipient User ID', type: 'string'},
      {name: 'type', title: 'Type', type: 'string'},
      {name: 'title', title: 'Title', type: 'string'},
      {name: 'body', title: 'Body', type: 'text'},
      {name: 'payload', title: 'Payload', type: 'text'},
      {name: 'read', title: 'Read', type: 'boolean', initialValue: false},
      {name: 'createdAt', title: 'Created At', type: 'datetime'},
    ],
  },
  {
    name: 'message',
    title: 'Message',
    type: 'document',
    fields: [
      {name: 'fromUserId', title: 'From User ID', type: 'string'},
      {name: 'toUserId', title: 'To User ID', type: 'string'},
      {name: 'body', title: 'Body', type: 'text'},
      {name: 'layoutId', title: 'Layout ID', type: 'string'},
      {name: 'readAt', title: 'Read At', type: 'datetime'},
      {name: 'createdAt', title: 'Created At', type: 'datetime'},
    ],
  },
  {
    name: 'connection',
    title: 'Connection',
    type: 'document',
    fields: [
      {name: 'userId', title: 'User ID', type: 'string'},
      {name: 'connectedUserId', title: 'Connected User ID', type: 'string'},
      {
        name: 'status',
        title: 'Status',
        type: 'string',
        options: {list: ['pending', 'accepted', 'declined']},
        initialValue: 'pending',
      },
      {name: 'createdAt', title: 'Created At', type: 'datetime'},
      {name: 'respondedAt', title: 'Responded At', type: 'datetime'},
    ],
  },
  {
    name: 'forumThread',
    title: 'Forum Thread',
    type: 'document',
    fields: [
      {name: 'authorUserId', title: 'Author User ID', type: 'string'},
      {name: 'title', title: 'Title', type: 'string'},
      {name: 'body', title: 'Body', type: 'text'},
      {name: 'replyCount', title: 'Reply Count', type: 'number', initialValue: 0},
      {name: 'createdAt', title: 'Created At', type: 'datetime'},
      {name: 'lastActivityAt', title: 'Last Activity At', type: 'datetime'},
    ],
  },
  {
    name: 'forumPost',
    title: 'Forum Post',
    type: 'document',
    fields: [
      {name: 'threadId', title: 'Thread ID', type: 'string'},
      {name: 'authorUserId', title: 'Author User ID', type: 'string'},
      {name: 'body', title: 'Body', type: 'text'},
      {name: 'createdAt', title: 'Created At', type: 'datetime'},
      {name: 'editedAt', title: 'Edited At', type: 'datetime'},
    ],
  },
  {
    name: 'user',
    title: 'User',
    type: 'document',
    fields: [
      {
        name: 'username',
        title: 'Username',
        type: 'string',
        validation: (Rule) => Rule.required(),
      },
      {
        name: 'email',
        title: 'Email',
        type: 'string',
        validation: (Rule) => Rule.required().email(),
      },
      {
        name: 'password',
        title: 'Password',
        type: 'string',
        validation: (Rule) => Rule.required(),
      },
      {
        name: 'title',
        title: 'Title',
        type: 'string',
      },
      {
        name: 'bio',
        title: 'Bio',
        type: 'text',
      },
      {
        name: 'profileImageUrl',
        title: 'Profile Image URL',
        type: 'url',
      },
    ],
  },
]
