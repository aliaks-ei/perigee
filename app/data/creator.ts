export const creator = {
  name: 'Aliaksei Mazheika',
  email: 'aliaksei.mazheika@gmail.com',
  linkedinUrl: 'https://www.linkedin.com/in/aliakseimazheika',
  githubUrl: 'https://github.com/aliaks-ei',
} as const

/** Public identity metadata shared by the article pages. Keep email out of it. */
export const creatorSchema = {
  '@type': 'Person' as const,
  name: creator.name,
  sameAs: [creator.linkedinUrl, creator.githubUrl],
}
