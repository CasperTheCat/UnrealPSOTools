<script lang='ts'>
	export let name = "Default Name";
    export let uuid: String = undefined;
    export let imgPath = "";
    export let type = "";
    export let alt = "";
    export let editState = 0;

    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    
    async function HandleCardClick(event)
    {
        let rect = event.target.getBoundingClientRect();

        let modx = rect.x + (rect.width/2);// + window.pageXOffset;
        let mody = rect.y + (rect.height/2);// + window.pageYOffset;

        if (window !== undefined && window.scrollY !== undefined && window.scrollX !== undefined)
        {
            modx = modx + window.scrollX;
            mody = mody + window.scrollY - (innerHeight / 2);
        }

        dispatch('summon', {
            "uuid": uuid,
            "name": name,
            "type": editState,
            "x": modx,//.pageX,
            "y": mody//pageY
        });
    }

</script>

<div class="cardblank" on:click={HandleCardClick}>
    {#if type !== ""}
        <div class="cardimage">
            <h2>{name}</h2>
        </div>
        <div class="card">{type}</div>
    {:else}
        <div class="cardimage">
            {#if imgPath !== ""}
                <img src={imgPath}/ alt={alt}>
            {/if}
        </div>
        <div class="card">{name}</div>
    {/if}
    
</div>

<style>
    .cardblank {
		width: 100%;
		height: 128px;
		background-color: #1c1c1c;
	}

    h2
    {
        padding-top:40px;
    }

	.cardimage {
		height: 96px;
        width: auto;
	}
</style>