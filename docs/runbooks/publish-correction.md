# Publish a Hijri date correction

1. Open the [Adwam correction admin](https://msalman5230.github.io/adwam/) and request a link for an approved staging admin email. Open the link in the same browser you used to request it. [Admin setup](../development-setup.md#correction-admin-sign-in)
2. Select the country, Hijri month and Hijri year. Enter day 1 as the civil date in that country. Paste an official announcement link that supports that date.
3. Compare the announced date with the computed Umm al-Qura date and the affected-install estimate. For a warning of more than two days, recheck the country, month, year and original announcement before confirming it.
4. Publish. On a connected Preview phone set to the same country, confirm the offer appears and the source is correct. Check that **Use** updates the displayed date and that **Keep my dates** preserves the previous date. Check **Undo** within its time window.
5. If the date was entered by mistake or the announcement was withdrawn, select the correction and withdraw it. Confirm the app removes the offer and drops this correction from its applied dates on the next successful sync.

Record the correction ID, country, month, year and source in the release or incident record. The date change applies to a phone after that user accepts it. Test with the staging project until the owner approves a production workflow.
