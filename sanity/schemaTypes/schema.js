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
              {
                name: 'color',
                title: 'Color',
                type: 'string', // Use string for color hex
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
            ],
          },
        ],
      },
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
