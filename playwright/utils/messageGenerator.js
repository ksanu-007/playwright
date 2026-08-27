// Generates realistic, multi-topic, multi-pattern discussion messages for the
// high-volume group conversation test. Content is template + topic-aspect
// based (not random) so a given (topic, pattern, variant) always renders the
// same text, keeping test runs reproducible.

export const REQUIRED_TOPICS = [
  'Artificial Intelligence',
  'Education',
  'Healthcare',
  'Geopolitics',
  'Politics',
  'Technology',
  'Economy',
  'Climate',
  'Cricket',
  'Basketball',
];

export const EXTRA_TOPICS = [
  'Cybersecurity',
  'Space Exploration',
  'Renewable Energy',
  'Startups',
  'Cloud Computing',
  'Robotics',
  'Future of Work',
  'Global Trade',
];

export const ALL_TOPICS = [...REQUIRED_TOPICS, ...EXTRA_TOPICS];

// Every phrase below is deliberately built around a singular grammatical
// head ("the rise of...", "the shortage of...", "adoption", "reform"...) so
// it agrees with singular-verb templates ("{aspect} is/does/matters...")
// regardless of whether the topical noun inside it is itself plural.
const TOPIC_ASPECTS = {
  'Artificial Intelligence': [
    'the rise of large language models', 'the adoption of generative AI coding assistants', 'AI-driven automated decision-making',
    'the push for AI regulation', 'the spread of AI agents replacing routine workflows', 'bias in machine learning models',
    'the compute cost behind frontier AI', 'AI safety and alignment research', 'the rise of multimodal AI systems',
  ],
  Education: [
    'the rise of personalized learning platforms', 'the shift toward remote and hybrid classrooms', 'standardized testing reform',
    'the shortage of qualified teachers', 'STEM curriculum redesign', 'student mental health support',
    'the affordability of higher education', 'vocational and skills-based training', 'the use of AI tutoring tools in the classroom',
  ],
  Healthcare: [
    'telemedicine adoption', 'the shortage of primary care providers', 'the rising cost of prescription drugs',
    'the rise of AI-assisted diagnostics', 'mental health parity in insurance coverage', 'the push for preventive care initiatives',
    'electronic health record interoperability', 'health equity across income groups', 'the strain on emergency departments',
  ],
  Geopolitics: [
    'the shift in trade alliances', 'the tension over semiconductor supply chains', 'the balance of power between major economies',
    'the rise of regional security agreements', 'the use of sanctions as a diplomatic tool', 'energy dependence between nations',
    'the role of international institutions', 'cross-border migration pressure', 'the influence of non-state actors',
  ],
  Politics: [
    'polarization in public discourse', 'campaign finance reform', 'voter turnout among younger generations',
    'the role of social media in elections', 'trust in public institutions', 'the push for bipartisan policy negotiations',
    'redistricting and its effect on representation', 'the influence of lobbying groups', 'transparency in government spending',
  ],
  Technology: [
    'the pace of cloud infrastructure adoption', 'the push for stronger data privacy regulation', 'the shift to edge computing',
    'the growth of open-source software ecosystems', 'the rise of cybersecurity threats to critical infrastructure', 'the consolidation of big tech platforms',
    'the rollout of 5G and next-generation connectivity', 'the environmental footprint of data centers', 'developer productivity tooling',
  ],
  Economy: [
    'the direction of inflation and interest rate policy', "the labor market's response to automation", 'supply chain resilience',
    'small business access to credit', 'wage growth versus cost of living', 'the housing affordability crisis',
    'the shift in consumer spending', 'the strength of the job market', 'volatility in global currencies',
  ],
  Climate: [
    'the transition to renewable energy', 'the debate over carbon pricing mechanisms', 'extreme weather resilience planning',
    'the rise of corporate sustainability commitments', 'the cost curve of battery storage', 'the push for international climate agreements',
    'the debate over reforestation and land-use policy', 'climate migration', 'the pace of EV adoption',
  ],
  Cricket: [
    'the growth of T20 franchise leagues', 'player workload management', 'the use of DRS and review technology',
    'the balance between red-ball and white-ball cricket', 'the emergence of talent from smaller cricketing nations',
    'the impact of data analytics on team strategy', 'the role of pitch conditions and home advantage',
    'scheduling congestion in the international calendar', 'the financial gap between boards',
  ],
  Basketball: [
    'the three-point revolution', 'load management for star players', 'the influence of advanced analytics on play-calling',
    'the growing international talent pipeline', 'the rise of player empowerment in team-building',
    'the impact of the salary cap on roster decisions', 'the strain of crowded schedules on young players',
    'the evolution of defensive schemes', "the globalization of the sport's fanbase",
  ],
  Cybersecurity: [
    'the rise of ransomware attacks on critical infrastructure', 'the shift toward zero-trust security architecture',
    'the shortage of skilled security professionals', 'the rise of supply chain vulnerabilities in software',
    'the rise of state-sponsored cyber operations', 'the role of AI in both attacks and defense',
    'multi-factor authentication adoption', 'incident response readiness', 'regulatory pressure around breach disclosure',
  ],
  'Space Exploration': [
    'the growth of commercial spaceflight', 'renewed interest in lunar missions', 'the growth of satellite constellations for global connectivity',
    'the debate over space debris management', 'international cooperation on Mars exploration',
    'the falling cost of launch technology', 'private investment in space startups',
    'the search for signs of life beyond Earth', 'the militarization of orbital space',
  ],
  'Renewable Energy': [
    'the falling cost of solar and wind power', 'grid modernization for intermittent energy sources',
    'the pace of battery storage breakthroughs', 'the politics of energy subsidies', 'the rise of community-owned renewable projects',
    'the pace of coal plant retirements', 'the emergence of green hydrogen as a fuel',
    'the supply constraint on critical minerals', 'energy access in developing regions',
  ],
  Startups: [
    'the tightening of venture capital funding', 'the shift from growth-at-all-costs to profitability',
    'the rise of AI-native startups', 'the toll of founder burnout on mental health', 'the difficulty of hiring in early-stage companies',
    'consolidation across crowded markets', 'remote-first company culture',
    'the challenge of building defensible moats', 'the pressure to reach profitability sooner',
  ],
  'Cloud Computing': [
    'the shift toward multi-cloud and hybrid cloud strategies', 'the rising cost of cloud infrastructure', 'the shift toward serverless architectures',
    'the concern around vendor lock-in', 'the push for data sovereignty requirements', 'the environmental impact of hyperscale data centers',
    'the role of cloud in AI model training', 'the risk of cloud security misconfigurations', 'edge-to-cloud integration',
  ],
  Robotics: [
    'the growth of warehouse and logistics automation', 'humanoid robotics research', 'the safety of human-robot collaboration',
    'the falling cost of robotic hardware', 'the rise of robotics in agriculture', 'the labor market impact of automation',
    'the advance in robotic dexterity', 'the rise of autonomous delivery robots', 'the push for robotics education and workforce readiness',
  ],
  'Future of Work': [
    'the normalization of hybrid work arrangements', 'the impact of AI on entry-level jobs', 'the push for four-day workweek experiments',
    "the gig economy's growth", 'the push for reskilling programs for displaced workers', 'the toll of burnout on workplace mental health',
    'the return-to-office debate', 'the push for pay transparency requirements', 'the changing definition of career growth',
  ],
  'Global Trade': [
    'the reshaping of global supply chains', 'the rise of tariffs and trade barriers', 'the reshoring of manufacturing',
    'the push for trade agreements between regional blocs', 'the bottleneck in shipping and logistics',
    "currency volatility's effect on exporters", 'the growth of e-commerce across borders',
    'compliance with new trade regulations', 'the impact of geopolitics on trade routes',
  ],
};

// Order mirrors a natural discussion arc: open with a question, work through
// reactions and evidence, then close with a recommendation/outlook/recap
// before the next question re-opens the cycle.
export const PATTERN_ORDER = [
  'question', 'answer', 'agreement', 'followUp', 'disagreement', 'counterpoint',
  'example', 'explanation', 'concern', 'industryPerspective', 'userPerspective',
  'recommendation', 'prediction', 'summary',
];

const TEMPLATES = {
  question: [
    'How do you think {aspect} will change {topicLower} over the next few years?',
    "What's everyone's take on {aspect} within {topicLower}?",
    'Do we think {aspect} is genuinely solving problems in {topicLower}, or just adding complexity?',
    'Has anyone looked closely at how {aspect} is playing out in {topicLower} lately?',
    'Where do you all stand on {aspect} as it relates to {topicLower}?',
    'Is {aspect} actually the right lever to pull for {topicLower}, or are we overestimating it?',
  ],
  answer: [
    'I think {aspect} will have a real impact, but {topicLower} still needs structural reforms alongside it.',
    "In my experience, {aspect} helps at the margins, though the core challenges in {topicLower} remain the same.",
    'My take is that {aspect} is overhyped right now, but it will matter a lot more for {topicLower} in five years.',
    'Honestly, {aspect} is already reshaping {topicLower} faster than most people realize.',
    "I'd say {aspect} is necessary but not sufficient — {topicLower} needs more than just that.",
    "From what I've seen, {aspect} works well in theory, but execution in {topicLower} is where it usually falls apart.",
  ],
  agreement: [
    "That's a fair point — {aspect} really does seem to be driving a lot of the change in {topicLower} right now.",
    'Agreed. {aspect} has been the biggest shift in {topicLower} I have noticed recently.',
    "Exactly, and I'd add that {aspect} is only going to become more important for {topicLower}.",
    "Same here — {aspect} matches what I've been seeing in {topicLower} as well.",
    'Good point. {aspect} is underrated when people talk about {topicLower}.',
    "Couldn't agree more. {aspect} deserves more attention in discussions about {topicLower}.",
  ],
  disagreement: [
    "I see it a bit differently — I don't think {aspect} is as central to {topicLower} as people assume.",
    "Respectfully, I'd push back on that. {aspect} hasn't made much difference in {topicLower} from what I've observed.",
    "I'm not fully convinced. {aspect} sounds promising, but {topicLower} has deeper issues it doesn't address.",
    "That's not quite how I'd frame it — {aspect} is a factor, but not the main one shaping {topicLower}.",
    "I'd disagree there. {aspect} gets a lot of attention, but it's not what's actually moving the needle in {topicLower}.",
    'Not sure I agree — in {topicLower}, {aspect} tends to get overstated in these conversations.',
  ],
  followUp: [
    'Building on that, how do you think {aspect} interacts with the other pressures facing {topicLower}?',
    "Following up on that — what would it actually take for {aspect} to make a real dent in {topicLower}?",
    "That raises another question: who's responsible for making sure {aspect} is handled well in {topicLower}?",
    'Curious to dig deeper — what does {aspect} look like in practice for {topicLower}?',
    'To add to that thread, how long before {aspect} becomes a standard part of {topicLower}?',
    'One more thing worth asking: what are the early signs that {aspect} is working in {topicLower}?',
  ],
  counterpoint: [
    "On the other hand, {aspect} could just as easily backfire if {topicLower} isn't ready for it.",
    'Then again, relying too heavily on {aspect} might create new problems for {topicLower}.',
    'But there is a flip side — {aspect} can widen gaps instead of closing them in {topicLower}.',
    "Still, we shouldn't ignore the risk that {aspect} moves faster than {topicLower} can adapt.",
    "That said, {aspect} isn't a silver bullet — {topicLower} has plenty of other bottlenecks.",
    'Worth noting, though — {aspect} tends to help those already ahead in {topicLower}, not those behind.',
  ],
  example: [
    "For example, I've seen cases where {aspect} directly changed outcomes in {topicLower}.",
    'A good example is how {aspect} has already started reshaping parts of {topicLower} in some regions.',
    'Take a recent case — {aspect} played a visible role in how {topicLower} unfolded there.',
    'As an example, teams and organizations focused on {aspect} are already ahead in {topicLower}.',
    'One concrete illustration: {aspect} made a measurable difference in a scenario related to {topicLower} that I followed closely.',
    "Here's an example worth mentioning — {aspect} was the deciding factor in a recent {topicLower} situation.",
  ],
  explanation: [
    'The reason {aspect} matters so much for {topicLower} is that it touches almost every part of the system.',
    'To put it simply, {aspect} works because it addresses one of the core bottlenecks in {topicLower}.',
    "What's happening with {aspect} is basically a shift in how {topicLower} has traditionally operated.",
    'The mechanics behind {aspect} explain why {topicLower} is changing as quickly as it is.',
    'If you break it down, {aspect} is really about rethinking the incentives that shape {topicLower}.',
    'In short, {aspect} is significant for {topicLower} because it changes who has access and who does not.',
  ],
  concern: [
    'One concern I have is that {aspect} could be adopted in {topicLower} without enough oversight.',
    'What worries me is that {aspect} might outpace the safeguards {topicLower} actually needs.',
    "I'm a little concerned that {aspect} benefits a few players in {topicLower} while leaving others behind.",
    'My worry is that {aspect} gets rushed in {topicLower} before anyone fully understands the consequences.',
    'It concerns me that discussions about {aspect} in {topicLower} rarely include the people most affected.',
    'A real risk here is that {aspect} widens existing inequalities within {topicLower}.',
  ],
  industryPerspective: [
    'From an industry standpoint, {aspect} is already a major line item in how organizations plan for {topicLower}.',
    'Speaking from experience in the field, {aspect} is one of the top priorities shaping {topicLower} right now.',
    'Industry leaders I have talked to see {aspect} as central to staying competitive in {topicLower}.',
    "From a practitioner's view, {aspect} is harder to implement in {topicLower} than the headlines suggest.",
    'In the industry, {aspect} is treated less as optional and more as table stakes for {topicLower}.',
    'Most organizations I have worked with are betting heavily on {aspect} to stay relevant in {topicLower}.',
  ],
  userPerspective: [
    'As someone on the receiving end of this, {aspect} feels like it directly affects my day-to-day experience with {topicLower}.',
    "From a regular user's point of view, {aspect} is the part of {topicLower} I actually notice the most.",
    'Personally, {aspect} has changed how I think about {topicLower} in my own life.',
    'As an everyday observer, I care less about the theory and more about whether {aspect} actually improves {topicLower}.',
    'Speaking just as someone affected by this, {aspect} is the piece of {topicLower} that matters most to me.',
    'From where I sit, {aspect} is the difference between {topicLower} feeling accessible or not.',
  ],
  recommendation: [
    "My recommendation would be to invest more in {aspect} before {topicLower} outgrows our ability to manage it.",
    "I'd suggest we prioritize {aspect} first — it seems like the highest-leverage move for {topicLower}.",
    'A practical next step would be piloting {aspect} on a smaller scale within {topicLower} before rolling it out further.',
    "If I were deciding, I'd focus resources on {aspect} given how much it affects {topicLower}.",
    "One recommendation: pair {aspect} with clear accountability measures so {topicLower} doesn't drift off course.",
    "I'd recommend keeping a close eye on {aspect} — it's likely to be the deciding factor for {topicLower}.",
  ],
  prediction: [
    'My prediction is that {aspect} will be one of the defining stories in {topicLower} over the next decade.',
    "I'd bet that {aspect} becomes the norm in {topicLower} much sooner than people expect.",
    'Looking ahead, {aspect} is going to force a lot of hard conversations about the future of {topicLower}.',
    'Five years from now, I think {aspect} will be seen as the turning point for {topicLower}.',
    'If current trends hold, {aspect} will only grow in importance for {topicLower}.',
    'I expect {aspect} to accelerate, and {topicLower} will have to adapt quickly or fall behind.',
  ],
  summary: [
    "To sum up where we've landed: {aspect} keeps coming up as the key theme in this {topicLower} discussion.",
    "Pulling this together, it sounds like {aspect} is the thread connecting most of what we've said about {topicLower}.",
    'So overall, the group seems to agree that {aspect} is central to where {topicLower} is headed.',
    'In summary, {aspect} stood out as the main point of debate around {topicLower} today.',
    "Wrapping up this thread — {aspect} was clearly the most discussed angle on {topicLower}.",
    'Bottom line: {aspect} is the piece of {topicLower} we should keep revisiting.',
  ],
};

function render(template, topic, aspect) {
  const text = template
    .replace(/\{topicLower\}/g, topic.toLowerCase())
    .replace(/\{topic\}/g, topic)
    .replace(/\{aspect\}/g, aspect);
  // {aspect} is lowercase, so any template that opens a new sentence with it
  // (e.g. "Agreed. {aspect} has been...") would otherwise read as a lowercase
  // sentence start.
  return text.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, sep, letter) => sep + letter.toUpperCase());
}

/**
 * Builds one message for a given position in the overall conversation.
 * @param {number} messageIndex - 1-based position of this message in the whole run.
 * @param {number} topicBlockSize - how many consecutive messages stay on one topic.
 * @param {number} startTopicIndex - which ALL_TOPICS entry the plan opens on
 *   (0 = Artificial Intelligence, matching the original 1-500 example). Runs
 *   shorter than a full pass over every topic would otherwise always land on
 *   whatever topic is first, regardless of message count.
 */
export function buildMessage(messageIndex, topicBlockSize = 50, startTopicIndex = 0) {
  const zeroBased = messageIndex - 1;
  const blockIndex = Math.floor(zeroBased / topicBlockSize);
  const topic = ALL_TOPICS[(blockIndex + startTopicIndex) % ALL_TOPICS.length];
  const posInBlock = zeroBased % topicBlockSize;
  const patternKey = PATTERN_ORDER[posInBlock % PATTERN_ORDER.length];

  // Grows once per full pass through PATTERN_ORDER, so template/aspect choice
  // keeps advancing across the whole run instead of resetting every block.
  const variantIndex = Math.floor(zeroBased / PATTERN_ORDER.length);

  const aspects = TOPIC_ASPECTS[topic];
  const templates = TEMPLATES[patternKey];
  const aspect = aspects[variantIndex % aspects.length];
  const template = templates[variantIndex % templates.length];

  return {
    index: messageIndex,
    topic,
    patternKey,
    text: render(template, topic, aspect),
  };
}

/**
 * Builds the full ordered list of messages for a high-volume conversation run.
 * @param {number} messageCount
 * @param {number} topicBlockSize
 * @param {number} startTopicIndex
 */
export function generateConversationPlan(messageCount, topicBlockSize = 50, startTopicIndex = 0) {
  const plan = [];
  for (let i = 1; i <= messageCount; i++) {
    plan.push(buildMessage(i, topicBlockSize, startTopicIndex));
  }
  return plan;
}
