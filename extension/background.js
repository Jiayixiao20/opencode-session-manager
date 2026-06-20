chrome.runtime.onInstalled.addListener(() => {
  console.log('OpenCode Session Manager extension installed')
})

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'http://localhost:8765' })
})
