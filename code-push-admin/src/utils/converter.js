
const parseValue = (val) => {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (!isNaN(val) && val.trim() !== '') return Number(val);
  return val;
};

const objToParamQuery = (data) => {
  return Object.entries(data)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
};

const paramQueryToObj = (qString) => {
  return Object.fromEntries(
    qString
      .split('&')
      .map(pair => {
        const [key, value] = pair.split('=');
        return [decodeURIComponent(key), parseValue(decodeURIComponent(value))];
      })
  );
};

module.exports = { objToParamQuery, paramQueryToObj };