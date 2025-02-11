export default function getActionHint(
    actionHintText: string = "Do you need any further assistance? Please let me know!",
    symbol: string,
    type: string,
    icon_url: string
) {
    return {
        text: actionHintText,
        actions: [
            {
                type: "button_send",
                text: `Buy $${symbol}`,
                data: {
                    type: type,
                    icon_url: icon_url
                }
            },
            {
                type: "button_swap",
                text: `Swap $${symbol}`,
                data: {
                    type: type,
                    icon_url: icon_url
                }
            }
        ]
    }
}