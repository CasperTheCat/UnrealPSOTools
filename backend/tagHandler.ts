// COPYRIGHT

function TagArrayToString(tags)
{
    let temp = [];

    for (let i = 0; i < tags.length; ++i)
    {
        temp.push(`'${tags[i]}'`);
    }

    return temp.join(" ");
}

export {TagArrayToString};