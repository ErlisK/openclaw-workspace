// Shared prompt builder for trial sessions

const STYLE_SUFFIX =
  ", children's coloring book page, thick bold black outlines only, " +
  "pure white background, no shading, no gray tones, no color fill, " +
  "simple enclosed regions, printable line art, clean"

const AGE_MODIFIERS: Record<string, string> = {
  '2-4':  'very simple large shapes, minimal detail, bold thick lines',
  '4-6':  'simple shapes, large regions, bold outlines',
  '6-8':  'moderate detail, 8-12 colorable regions',
  '8-11': 'more detail, decorative patterns, clean closed lines',
}

export interface PromptItem { prompt: string; subject: string }

export function buildPrompts(
  concept: 'interest-packs' | 'story-to-book',
  config: Record<string, unknown>
): PromptItem[] {
  const age = (config.ageRange as string) || '6-8'
  const ageMod = AGE_MODIFIERS[age] || AGE_MODIFIERS['6-8']

  if (concept === 'interest-packs') {
    const interests = (config.interests as string[]) || ['dinosaur', 'space']
    return [
      {
        subject: `${interests[0]} + ${interests[1] || interests[0]}`,
        prompt: `cute ${interests[0]} and ${interests[1] || 'friend'} playing together in a fun colorful scene${STYLE_SUFFIX}, ${ageMod}`,
      },
      {
        subject: `${interests[0]} adventure`,
        prompt: `happy ${interests[0]} on an exciting adventure, cheerful scene${STYLE_SUFFIX}, ${ageMod}`,
      },
      {
        subject: `${interests[1] || interests[0]} + ${interests[2] || interests[0]}`,
        prompt: `${interests[1] || interests[0]} and ${interests[2] || 'friends'} on a magical journey${STYLE_SUFFIX}, ${ageMod}`,
      },
      {
        subject: `${interests[0]} party`,
        prompt: `${interests[0]} celebrating with ${interests[1] || 'friends'} at a fun party${STYLE_SUFFIX}, ${ageMod}`,
      },
    ].slice(0, 4)
  }

  const chars   = (config.characters as string[]) || ['dinosaur', 'unicorn']
  const setting = (config.setting as string) || 'magical forest'
  const action  = (config.action as string) || 'explore'
  const hero    = ((config.heroName as string) || 'the hero').slice(0, 20).replace(/[^a-zA-Z0-9\s]/g, '')

  return [
    {
      subject: `${hero} begins`,
      prompt: `${chars[0]} hero named ${hero} starts their adventure in ${setting}${STYLE_SUFFIX}, ${ageMod}`,
    },
    {
      subject: `${hero} explores`,
      prompt: `${hero} the ${chars[0]} begins to ${action} through ${setting}, amazing discoveries${STYLE_SUFFIX}, ${ageMod}`,
    },
    {
      subject: `challenge`,
      prompt: `${hero} the ${chars[0]} faces a challenge, ${chars[1] || 'a friend'} helps them in ${setting}${STYLE_SUFFIX}, ${ageMod}`,
    },
    {
      subject: `${hero} wins!`,
      prompt: `${hero} the ${chars[0]} celebrates victory with ${chars[1] || 'friends'} in ${setting}${STYLE_SUFFIX}, ${ageMod}`,
    },
  ]
}
