module.exports = async function (__scope__) {
  await __scope__.renderElement({
    tagName: "element",
    isVoid: false,
    isSelfClosing: true,
    attributes: [__scope__.createNormalAttribute({
      name: "attribute",
      quote: "\"",
      values: ["/items/", "/edit"]
    })],
    body: async () => {}
  });
};