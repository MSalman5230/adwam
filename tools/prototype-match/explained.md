# Differences from the prototype

## Prayer times

The tests compare 2026 prayer times in London, Oslo, Jakarta, Toronto and Cape Town, with the same calculation method on both sides. D7's Singapore suggestion for Jakarta applies when the app chooses a default method.

Adhan calculates standard ʿAṣr three minutes later than the prototype in Oslo on 15, 18, 22, 28 and 29 January and 10 February. The prototype uses one pass of a compact solar calculation. Adhan interpolates the Sun's position while solving for the afternoon shadow length, which affects the result when the winter Sun is low. All other comparisons fall within two minutes.

The angle-based rule applies to the standard calculation methods. Adhan's Moonsighting Committee method retains its seasonal adjustments. If the Sun fails to rise or set, Adhan estimates the anchors using its nearest-latitude fallback.
