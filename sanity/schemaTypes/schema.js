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
      {name: 'originalName', title: 'Original Filename', type: 'string'},
      {name: 'createdAt', title: 'Created At', type: 'datetime'},
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
    ],
  },
]
