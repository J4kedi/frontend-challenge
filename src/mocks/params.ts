import { isScenario, type ScenarioName } from './scenarios'

export interface MockParams {
  scenario: ScenarioName | null
  reset: boolean
}

/**
 * Reads `?scenario=<name>` and `?mock-reset` and removes them from the URL
 * before the router starts, so they never leak into the app's search state.
 */
export function takeMockParams(): MockParams {
  const url = new URL(window.location.href)
  const requested = url.searchParams.get('scenario')
  const params: MockParams = {
    scenario: isScenario(requested) ? requested : null,
    reset: url.searchParams.has('mock-reset'),
  }
  if (url.searchParams.has('scenario') || params.reset) {
    url.searchParams.delete('scenario')
    url.searchParams.delete('mock-reset')
    window.history.replaceState(window.history.state, '', url)
  }
  return params
}
