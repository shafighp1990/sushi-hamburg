const config = process.env.SUSHI_STATIC === '1' ? {output:'export' as const} : {};
export default config;
